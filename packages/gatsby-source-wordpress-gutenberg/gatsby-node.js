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

// common fields used in block interface/object graphql types
// uses gatsby's schema builder syntax
const BLOCK_INTERFACE_FIELDS = {
  attributesJSON: {
    type: `String!`,
    description: `Serialized attributes in JSON format`,
  },
  blockTypeJSON: {
    type: `String!`,
    description: `Serialized block definition in JSON format`,
  },
  clientId: `String!`,
  isValid: `Boolean!`,
  isReusableBlock: `Boolean!`,
  isDynamicBlock: `Boolean!`,
  dynamicContent: {
    type: `String!`,
    description: `Block's server rendered output`,
  },
  name: `String!`,
  originalContent: {
    type: `String!`,
    description: `Block's output without innerBlocks's output`,
  },
  saveContent: {
    type: `String!`,
    description: `Block's output including innerBlocks's output`,
  },
  validationIssues: `[String!]!`,
  innerBlocks: {
    type: `[GutenbergBlock!]!`,
    resolve: (source, args, context, info) => source.innerBlocksNodes.map(id => context.nodeModel.getNodeById({ id })),
  },
}

// object to store promises which we don't want to await right away
const jobs = {}

// variables to store data between gatsby's lifecycle
const blockTypeByBlockName = new Map()
const postByPostId = new Map()
let dynamicBlockNames
let client

// converts wp block name to graphql type name
const typenameFromBlockName = blockName => {
  const split = blockName.split(`/`)
  return `${split.map(pascalize).join(``)}GutenbergBlock`
}

// launches gutenberg in headless browser and saves reference to page for reuse
const launchGutenberg = async ({ reporter, postId }, pluginOptions) => {
  if (!jobs.launchGutenberg) {
    reporter.info(`spawning gutenberg`)
    const startTime = process.hrtime()

    const { uri, user, password } = pluginOptions
    // for our purposes it kinda does not matter which post we open as long as it is gutenberg post
    const editorUrl = `${uri}/wp-admin/post.php?post=${postId}&action=edit`

    // try to perform standard auth when not already authenticated
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
          // closes editor on page to avoid unwanted autosaves etc.
          await closeEditor(page)

          reporter.success(`gutenberg spawn - ${elapsedSeconds(startTime)}`)
          return page
        })
    )
  }

  return await jobs.launchGutenberg
}

// closes launched page if present
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

  // setup apollo client - support basic http auth out of the box since we require user/password
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
        // allow user to overide link through plugin options
        ...linkOptions,
      }),
    ]),
    // disables all caching whatsoever
    defaultOptions: {
      query: {
        fetchPolicy: `network-only`,
        errorPolicy: `all`,
      },
    },
    cache: new InMemoryCache(),
  })

  // launch headless browser
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
        blocksJSON: {
          type: `String!`,
          description: `Serialized parsed blocks in JSON format`,
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

  // we should depracate this upon new gatsby-source-wordpress and use native sources instead
  const posts = await fetchAllGutenbergPosts({ client, first: 100 })

  // refetch/reset mappings
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

      // build our block graphql types using blocks library
      // we don't want to launch gutenberg if there weren't any nodes
      // so we act upon first index
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

      // then we can create nodes
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

          // block can be reused in gutenberg admin (stored as wp_block post type)
          let isReusableBlock = false

          // block has registered render function in php
          let isDynamicBlock = dynamicBlockNames.includes(source.name)

          // core/block represents reusable block
          // we will not represent core/block as our type, but instead use the type which it refrences to
          // so reusable blocks are transparent when queried
          if (block.name === `core/block`) {
            // reference to wp_block post_type id is stored in ref attribute
            const reusableBlockBlocks = await getParsedBlocks(page, postByPostId.get(block.attributes.ref).postContent)
            source = reusableBlockBlocks[0]
            isReusableBlock = true

            // core/block is for some reason also present in dynamic blocks
            isDynamicBlock = false
          }

          const { innerBlocks, ...rest } = source

          // block's clientId property is not consistent
          // so we use blocks position in nested array as its id
          const id = createNodeId(`gutenberg-block-${node.postId}-${innerLevel}-${index}`)

          // recursively source inner blocks and set theit parent node to this node
          const innerBlocksNodes = await sourceBlocks(innerBlocks, id, innerLevel + 1)

          const blockNode = {
            id,
            internal: {
              type: typenameFromBlockName(source.name),
            },
            ...rest,
            isReusableBlock,
            // gatsby's parent node reference
            parent,
            // serialize attributes (may be useful in theme)
            attributesJSON: JSON.stringify(source.attributes),
            // serialize block type definition from registry
            blockTypeJSON: JSON.stringify(blockTypeByBlockName.get(source.name)),
            // every block further down the line will have reference to parent post
            parentPost___NODE: node.id,
            // block's output including inner blocks
            saveContent: await getSaveContent(page, source),
            isDynamicBlock,
            // dynamic html rendered from php
            dynamicContent: isDynamicBlock
              ? await renderDynamicBlock({ client, blockName: source.name, attributes: source.attributes })
              : null,
            // we use this field in createCustomResolver to have nice interfaces in graphql types instead of
            // gatsby's default unions
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

    // this is the "master" node containing all root blocks
    // this is needed to be able to have nice interfaces upon querying and hence we can't
    // excent third party schema, our "master" node has reference to it as parent node
    // this will be also useful when using gatsby-source-wordpress later on
    const id = createNodeId(`gutenberg-content-${node.postId}`)

    // we have our single source of truth stored in gatsby's node
    const blocks = await getParsedBlocks(page, node.postContent)
    const blocksNodes = await sourceBlocks(blocks, id)

    const contentNode = {
      id,
      internal: {
        type: `GutenbergContent`,
      },
      parent: node.id,
      blocksJSON: JSON.stringify(blocks),
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
  // we can close out headless browser for now
  // it will be opened upon new node creation again
  await closeGutenberg(options)
}

// TODO: Remove this old code upon release

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
