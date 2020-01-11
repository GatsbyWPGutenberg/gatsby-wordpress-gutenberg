const { ApolloClient } = require(`apollo-client`)
const { HttpLink } = require(`apollo-link-http`)
const { ApolloLink } = require(`apollo-link`)
const { InMemoryCache } = require(`apollo-cache-inmemory`)
const fetch = require(`node-fetch`)
// const { onError } = require(`apollo-link-error`)
// const { print } = require(`graphql`)

const puppeteer = require(`puppeteer`)
const { pascalize } = require(`humps`)

const { fetchAllGutenbergPosts, fetchDynamicBlockNames, renderDynamicBlock } = require(`./gatsby-gutenberg`)
const {
  closeEditor,
  blockEditorPage,
  getBlockTypes,
  getParsedBlocks,
  getSaveContent,
  login,
  NotABlockEditorPageError,
} = require(`./gutenberg-puppeteer`)
const { elapsedSeconds } = require(`./utils`)

const BLOCK_INTERFACE_FIELDS = {
  attributesJSON: `String!`,
  blockTypeJSON: `String!`,
  clientId: `String!`,
  isValid: `Boolean!`,
  isReusableBlock: `Boolean!`,
  isDynamicBlock: `Boolean!`,
  dynamicContent: `String`,
  name: `String!`,
  originalContent: `String!`,
  saveContent: `String!`,
  validationIssues: `[String!]!`,
  innerBlocks: {
    type: `[GutenbergBlock!]!`,
    resolve: (source, args, context, info) => source.innerBlocksNodes.map(id => context.nodeModel.getNodeById({ id })),
  },
}

const jobs = {}
const blockTypeByBlockName = new Map()
const postByPostId = new Map()
let dynamicBlockNames
let client

const typenameFromBlockName = blockName => {
  const split = blockName.split(`/`)
  return `${split.map(pascalize).join(``)}GutenbergBlock`
}

const launchGutenberg = async ({ reporter, postId }, pluginOptions) => {
  if (!jobs.launchGutenberg) {
    reporter.info(`spawning gutenberg`)
    const startTime = process.hrtime()

    const { uri, user, password } = pluginOptions
    const editorUrl = `${uri}/wp-admin/post.php?post=${postId}&action=edit`

    jobs.launchGutenberg = jobs.launchBrowser.then(browser =>
      blockEditorPage(browser, editorUrl)
        .catch(err => {
          if (err instanceof NotABlockEditorPageError) {
            reporter.info(`performing gutenberg login`)

            const loginUrl = `${uri}/wp-login.php`
            return login(browser, loginUrl, user, password).then(() => blockEditorPage(browser, editorUrl))
          }

          throw err
        })
        .then(async page => {
          await closeEditor(page)

          reporter.success(`gutenberg spawn - ${elapsedSeconds(startTime)}`)
          return page
        })
    )
  }

  return await jobs.launchGutenberg
}

const closeGutenberg = async ({ reporter }) => {
  if (jobs.launchGutenberg) {
    const job = jobs.launchGutenberg
    jobs.launchGutenberg = null

    let page

    try {
      page = await job
    } catch (err) {
      // pass
    }

    if (page) {
      await page.close()
      reporter.info(`gutenberg closed`)
    }
  }
}

exports.onPreBootstrap = async (options, pluginOptions) => {
  const { linkOptions, user, password, uri } = pluginOptions

  const defaultUri = new URL(uri)
  defaultUri.username = user
  defaultUri.password = password
  defaultUri.pathname = `/graphql`

  client = new ApolloClient({
    link: ApolloLink.from([
      // onError(async onErrorOptions => {
      //   if (linkOptions) {
      //     if (linkOptions.onError) {
      //       linkOptions.onError(onErrorOptions)
      //     }
      //   }
      //   const { operation, networkError } = onErrorOptions

      //   if (networkError && networkError.response) {
      //     reporter.error(print(operation.query), networkError.response)
      //   }
      // }),
      new HttpLink({
        fetch,
        uri: defaultUri.href,
        ...linkOptions,
      }),
    ]),
    defaultOptions: {
      query: {
        fetchPolicy: `network-only`,
        errorPolicy: `all`,
      },
    },
    cache: new InMemoryCache(),
  })

  jobs.launchBrowser = puppeteer.launch({ headless: true })
}

exports.createSchemaCustomization = ({ actions, schema }) => {
  const { createTypes } = actions

  createTypes(
    schema.buildInterfaceType({
      name: `GutenbergBlock`,
      fields: BLOCK_INTERFACE_FIELDS,
    })
  )

  createTypes(
    schema.buildObjectType({
      name: `GutenbergContent`,
      fields: {
        blocks: {
          type: `[GutenbergBlock!]!`,
          resolve: (source, args, context, info) => source.blocksNodes.map(id => context.nodeModel.getNodeById({ id })),
        },
      },
      interfaces: [`Node`],
    })
  )
}

exports.sourceNodes = async (options, pluginOptions) => {
  const {
    actions,
    createContentDigest,
    createNodeId,
    schema,
    // reporter,
  } = options

  const posts = await fetchAllGutenbergPosts({ client, first: 100 })

  dynamicBlockNames = await fetchDynamicBlockNames({ client })
  blockTypeByBlockName.clear()
  postByPostId.clear()

  posts.forEach(post => {
    postByPostId.set(post.postId, post)
  })

  await Promise.all(
    posts.map(async (post, index) => {
      const { createNode, createTypes } = actions
      const { id, __typename, ...rest } = post

      const node = {
        ...rest,
        id: createNodeId(`gutenberg-post-${id}`),
        postTypename: __typename,
        nodeId: id,
        internal: {
          type: `GutenbergPost`,
        },
      }

      node.internal.contentDigest = createContentDigest(JSON.stringify(node))

      if (index === 0) {
        const page = await launchGutenberg({ ...options, postId: node.postId }, pluginOptions)

        jobs.getBlockTypes = getBlockTypes(page)
        const blockTypes = await jobs.getBlockTypes

        blockTypes.map(async blockType => {
          blockTypeByBlockName.set(blockType.name, blockType)

          createTypes(
            schema.buildObjectType({
              name: typenameFromBlockName(blockType.name),
              fields: BLOCK_INTERFACE_FIELDS,
              interfaces: [`GutenbergBlock`, `Node`],
            })
          )
        })
      }

      await createNode(node)
    })
  )
}

exports.onCreateNode = async (options, pluginOptions) => {
  const {
    node,
    actions: { createNode, createParentChildLink },
    createContentDigest,
    createNodeId,
  } = options

  if (node.internal.type === `GutenbergPost`) {
    const page = await launchGutenberg({ ...options, postId: node.postId }, pluginOptions)

    const sourceBlocks = async (blocks, parent, innerLevel = 0) =>
      await Promise.all(
        blocks.map(async (block, index) => {
          let source = block

          let isReusableBlock = false
          let isDynamicBlock = dynamicBlockNames.includes(source.name)

          if (block.name === `core/block`) {
            const reusableBlockBlocks = await getParsedBlocks(page, postByPostId.get(block.attributes.ref).postContent)
            source = reusableBlockBlocks[0]
            isReusableBlock = true
            isDynamicBlock = false
          }

          const { innerBlocks, ...rest } = source

          const id = createNodeId(`gutenberg-block-${node.postId}-${innerLevel}-${index}`)
          const innerBlocksNodes = await sourceBlocks(innerBlocks, id, innerLevel + 1)

          const blockNode = {
            id,
            internal: {
              type: typenameFromBlockName(source.name),
            },
            ...rest,
            isReusableBlock,
            parent,
            attributesJSON: JSON.stringify(source.attributes),
            blockTypeJSON: JSON.stringify(blockTypeByBlockName.get(source.name)),
            parentPost___NODE: node.id,
            saveContent: await getSaveContent(page, source),
            isDynamicBlock,
            dynamicContent: isDynamicBlock
              ? await renderDynamicBlock({ client, blockName: source.name, attributes: source.attributes })
              : null,
            innerBlocksNodes: innerBlocksNodes.map(child => child.id),
          }

          blockNode.internal.contentDigest = createContentDigest(JSON.stringify(blockNode))
          await createNode(blockNode)

          innerBlocksNodes.forEach(child => {
            createParentChildLink({
              parent: blockNode,
              child,
            })
          })

          return blockNode
        })
      )

    const id = createNodeId(`gutenberg-content-${node.postId}`)
    const blocksNodes = await sourceBlocks(await getParsedBlocks(page, node.postContent), id)

    const contentNode = {
      id,
      internal: {
        type: `GutenbergContent`,
      },
      parent: node.id,
      blocksNodes: blocksNodes.map(child => child.id),
    }

    contentNode.internal.contentDigest = createContentDigest(JSON.stringify(contentNode))
    await createNode(contentNode)

    blocksNodes.forEach(child => {
      createParentChildLink({
        parent: contentNode,
        child,
      })
    })

    createParentChildLink({
      parent: node,
      child: contentNode,
    })
  }
}

exports.createPages = async options => {
  await closeGutenberg(options)
}

// exports.onCreateNode = async (options, pluginOptions) => {
// const { createNode, createParentChildLink } = actions
// if (node.internal.type === "File" && node.sourceInstanceName === "gutenberg-source-components") {
//   const document = parse(
//     await pluck.fromFile(node.absolutePath, {
//       modules: [
//         {
//           name: "gatsby",
//           identifier: "graphql",
//         },
//       ],
//     })
//   )
//   let fragment = null
//   let typename = null
//   document.definitions.map(async d => {
//     if (d.kind === Kind.FRAGMENT_DEFINITION) {
//       if (/WP_.*Block$/.test(d.typeCondition.name.value)) {
//         typename = d.typeCondition.name.value
//         fragment = d
//       }
//     }
//   })
//   if (fragment && typename) {
//     const childNode = {
//       id: createNodeId(`gutenberg-source-component-file-${node.relativePath}`),
//       fragmentName: fragment.name.value,
//       fragment: print(fragment),
//       absolutePath: node.absolutePath,
//       blockTypename: fragment.typeCondition.name.value,
//       parent: node.id,
//       internal: {
//         type: "GutenbergSourceComponentFile",
//       },
//     }
//     childNode.internal.contentDigest = createContentDigest(JSON.stringify(childNode))
//     await createNode(childNode)
//     createParentChildLink({ parent: node, child: childNode })
//   }
// }
// }

// exports.createPages = async ({ graphql, createNodeId, createContentDigest, actions }) => {
//   const { createNode } = actions

//   const {
//     data: { allGutenbergPost, allGutenbergSourceComponentFile },
//     errors,
//   } = await graphql(`
//     query {
//       allGutenbergPost {
//         edges {
//           node {
//             blocksJSON
//             postId
//             postTypename
//             nodeId
//             link
//           }
//         }
//       }
//       allGutenbergSourceComponentFile {
//         edges {
//           node {
//             blockTypename
//             fragmentName
//             fragment
//             absolutePath
//           }
//         }
//       }
//     }
//   `)

//   if (errors) {
//     throw errors
//   }

//   const sourceComponentFileByBlockTypename = allGutenbergSourceComponentFile.edges.reduce((obj, { node }) => {
//     obj[node.blockTypename] = node

//     return obj
//   }, {})

//   await Promise.all(
//     allGutenbergPost.edges.map(async ({ node }) => {
//       const { blockTypenames, innerBlocksLevel } = getBlocksMetadata({ blocks: JSON.parse(node.blocksJSON) || [] })
//       const sourceComponentFiles = getSourceComponentFiles({
//         blockTypenames,
//         sourceComponentFileByBlockTypename,
//       })

//       const componentPath = path.join(
//         process.cwd(),
//         ".cache",
//         "gatsby-source-wordpress-gutenberg",
//         "components",
//         `blocks`,
//         `${node.postId}.js`
//       )

//       const source = await generateBlocks({
//         ...node,
//         sourceComponentFiles,
//         id: node.postId,
//         innerBlocksLevel,
//         postTypename: `WP_${node.postTypename}`,
//       })

//       const oldSource = await fs.readFile(componentPath, "utf-8").catch(() => {
//         return null
//       })

//       if (oldSource !== source) {
//         await fs.outputFile(componentPath, source)
//       }

//       const pageNode = {
//         id: createNodeId(`gutenberg-page-${node.postId}`),
//         source,
//         component: path.resolve(componentPath),
//         path: new URL(node.link).pathname,
//         blocksJSON: node.blocksJSON,
//         internal: {
//           type: "GutenbergPage",
//         },
//       }

//       pageNode.internal.contentDigest = createContentDigest(JSON.stringify(pageNode))
//       await createNode(pageNode)
//     })
//   )

//   await createPages({ graphql, actions })
// }

// exports.onCreateWebpackConfig = ({ actions, getConfig }) => {
//   actions.setWebpackConfig({
//     resolve: {
//       modules: [path.resolve(path.join(process.cwd(), ".cache"))],
//     },
//   })
// }

// const getBlocksMetadata = ({ blocks, currentInnerBlocksLevel = 1 }) => {
//   const blockTypenames = new Set()
//   let innerBlocksLevel = currentInnerBlocksLevel

//   blocks.forEach(block => {
//     blockTypenames.add(`WP_${block.__typename}`)

//     if (block.innerBlocks.length) {
//       const result = getBlocksMetadata({
//         blocks: block.innerBlocks,
//         currentInnerBlocksLevel: currentInnerBlocksLevel + 1,
//       })

//       result.blockTypenames.forEach(blockTypename => {
//         blockTypenames.add(blockTypename)
//       })

//       innerBlocksLevel = result.innerBlocksLevel
//     }
//   })

//   return {
//     blockTypenames,
//     innerBlocksLevel,
//   }
// }

// const getSourceComponentFiles = ({ sourceComponentFileByBlockTypename, blockTypenames }) => {
//   let hasUnknownBlock = false
//   const sourceComponentFiles = []
//   const processedBlockTypenames = new Set()

//   blockTypenames.forEach(blockTypename => {
//     if (processedBlockTypenames.has(blockTypename)) {
//       return
//     }

//     const sourceComponentFile = sourceComponentFileByBlockTypename[blockTypename]

//     if (sourceComponentFile) {
//       sourceComponentFiles.push(sourceComponentFile)
//     } else {
//       hasUnknownBlock = true
//     }

//     processedBlockTypenames.add(blockTypename)
//   })

//   if (hasUnknownBlock) {
//     sourceComponentFiles.push(sourceComponentFileByBlockTypename["WP_Block"])
//   }

//   return sourceComponentFiles
// }

// const generateBlocks = ({ sourceComponentFiles, id, postTypename, nodeId, innerBlocksLevel }) => {
//   const banner = `/* eslint-disable */
// /* Warning: this file is autogerated, any changes would be lost */
// `

//   if (!sourceComponentFiles.length) {
//     return `${banner}
// export default () => null;
// `
//   }

//   const fragmentName = `GutenbergBlocks${id}`

//   const getFragment = (level = 1) => {
//     let fragment = level === 1 ? `{ ...${fragmentName}` : ` innerBlocks { ...${fragmentName}`

//     if (level < innerBlocksLevel) {
//       fragment += getFragment(level + 1)
//     }

//     fragment += ` }`

//     return fragment
//   }

//   return `
// ${banner}
// import React from 'react';
// import { graphql } from 'gatsby';
// ${sourceComponentFiles
//   .map(({ absolutePath, fragmentName }) => `import ${fragmentName} from '${absolutePath}';`)
//   .join("\n")}

// const Blocks = ({blocks}) => {
//   return (
//     <>
//       {blocks.map((block, i) => {
//         if (!block) {
//           return null;
//         }

//         const children = block.innerBlocks ? <Blocks blocks={block.innerBlocks} /> : null;
//         ${sourceComponentFiles
//           .map(({ fragmentName, blockTypename }) => {
//             return blockTypename === "WP_Block"
//               ? `
//         return <${fragmentName} {...block} children={children} key={i} />;`
//               : `
//         if (block.__typename === '${blockTypename}') {
//           return <${fragmentName} {...block} children={children} key={i} />;
//         }`
//           })
//           .join("\n")}
//       })}
//     </>
//   );
// };

// export const pageQuery = graphql\`
//   fragment ${fragmentName} on WP_Block {
//     __typename
//     ${sourceComponentFiles.map(({ fragmentName }) => `...${fragmentName}`).join("\n    ")}
//   }
//   query GetGutenbergBlocks${id} {
//     wp {
//       node(id: "${nodeId}") {
//         ...on ${postTypename} {
//           blocks ${getFragment()}
//         }
//       }
//     }
//   }\`;

// export default ({data}) =>
//   <Blocks blocks={data.wp.node.blocks} />;
// `
// }

// const createPages = async ({ graphql, actions: { createPage } }) => {
//   const { data, errors } = await graphql(`
//     query {
//       allGutenbergPage {
//         edges {
//           node {
//             component
//             path
//           }
//         }
//       }
//     }
//   `)

//   if (errors) {
//     throw errors
//   }

//   if (data) {
//     data.allGutenbergPage.edges.forEach(({ node: { component, path } }) => {
//       createPage({
//         path,
//         component,
//       })
//     })
//   }
// }
