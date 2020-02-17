const { ApolloClient } = require(`apollo-client`)
const { HttpLink } = require(`apollo-link-http`)
const { ApolloLink } = require(`apollo-link`)
const { InMemoryCache } = require(`apollo-cache-inmemory`)
const fetch = require(`node-fetch`)
// const { onError } = require(`apollo-link-error`)
// const { print } = require(`graphql`)

const puppeteer = require(`puppeteer`)
const { pascalize } = require(`humps`)
const proxy = require(`http-proxy-middleware`)

const {
  // fetchAllGutenbergPosts,
  fetchDynamicBlockNames,
  fetchFirstGutenbergPost,
  renderDynamicBlock,
} = require(`./gatsby-gutenberg`)
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

const DEFAULT_SOURCE_NODE_FIELD_NAME = `gutenberg`

// common fields used in block interface/object graphql types
// uses gatsby's schema builder syntax
const BLOCK_INTERFACE_FIELDS = {
  id: `ID!`,
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
    resolve: async (source, args, context, info) => {
      if (source.name === `core/block`) {
        const filter = {
          isPreview: { eq: source.isPreview },
          postId: { eq: source.attributes.ref },
        }

        if (source.isPreview) {
          filter.previewPostId = { eq: source.previewPostId }
        }

        const contentNode = await context.nodeModel.runQuery({
          query: {
            filter,
          },
          type: `GutenbergContent`,
          firstOnly: true,
        })

        if (!contentNode || !contentNode.fields || !contentNode.fields.blocksNodes) {
          return []
        }

        return contentNode.fields.blocksNodes.map(id => context.nodeModel.getNodeById({ id }))
      }

      if (!source.fields || !source.fields.innerBlocksNodes) {
        return []
      }

      return source.fields.innerBlocksNodes.map(id => context.nodeModel.getNodeById({ id }))
    },
  },
}

// object to store promises which we don't want to await right away
const jobs = {}

// variables to store data between gatsby's lifecycle
const blockTypeByBlockName = new Map()
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
  const { linkOptions } = pluginOptions

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

exports.createSchemaCustomization = async (options, pluginOptions) => {
  const { actions, schema } = options

  const { createTypes } = actions

  createTypes(
    schema.buildObjectType({
      name: `GutenbergPreview`,
      fields: {
        id: `ID!`,
      },
      interfaces: [`Node`],
    })
  )

  createTypes(
    schema.buildInterfaceType({
      name: `GutenbergBlock`,
      fields: BLOCK_INTERFACE_FIELDS,
    })
  )

  const { sourceNodeFieldName = DEFAULT_SOURCE_NODE_FIELD_NAME } = pluginOptions

  createTypes(
    schema.buildObjectType({
      name: `GutenbergContent`,
      fields: {
        modifiedTime: `String!`,
        postId: `Int!`,
        slug: `String`,
        link: `String`,
        isPreview: `Boolean!`,
        blocks: {
          type: `[GutenbergBlock]`,
          resolve: (source, args, context, info) => {
            if (!source.fields || !source.fields.blocksNodes) {
              return []
            }

            return source.fields.blocksNodes.map(id => context.nodeModel.getNodeById({ id }))
          },
        },
        blocksJSON: {
          type: `String!`,
          description: `Serialized parsed blocks in JSON format`,
        },
      },
      interfaces: [`Node`],
    })
  )

  blockTypeByBlockName.clear()
  const post = await fetchFirstGutenbergPost({ fieldName: sourceNodeFieldName, client })

  if (post) {
    // const page = await launchGutenberg({ ...options, postId: post[sourceNodeFieldName].postId }, pluginOptions)
    const page = await launchGutenberg({ ...options, postId: post.postId }, pluginOptions)

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
}

exports.sourceNodes = async (options, pluginOptions) => {
  const {
    actions,
    createContentDigest,
    createNodeId,
    // reporter,
  } = options

  const { createNode } = actions

  await Promise.all(
    Array.from(blockTypeByBlockName.entries()).map(async ([blockName, blockType]) => {
      const node = {
        id: createNodeId(`gutenberg-block-type-${blockName}`),
        blockName,
        blockTypename: typenameFromBlockName(blockName),
        blockTypeJSON: JSON.stringify(blockType),
        internal: {
          type: `GutenbergBlockType`,
        },
      }

      node.internal.contentDigest = createContentDigest(JSON.stringify(node))
      await createNode(node)
    })
  )

  // refetch/reset mappings
  dynamicBlockNames = await fetchDynamicBlockNames({ client })
}

exports.onCreateNode = async (options, pluginOptions) => {
  const {
    node,
    actions: { createNode, createParentChildLink, createNodeField },
    createContentDigest,
    createNodeId,
  } = options

  const sourceBlocks = async ({ blocks, parent, innerLevel = 0, isPreview, getSaveContent, postId, previewPostId }) =>
    await Promise.all(
      blocks.map(async (block, index) => {
        // block can be reused in gutenberg admin (stored as wp_block post type)
        let isReusableBlock = false

        // block has registered render function in php
        let isDynamicBlock = dynamicBlockNames.includes(block.name)

        // core/block represents reusable block
        if (block.name === `core/block`) {
          isReusableBlock = true
          // core/block is for some reason also present in dynamic blocks
          isDynamicBlock = false
        }

        const { innerBlocks, ...rest } = block

        // block's clientId property is not consistent
        // so we use blocks position in nested array as its id
        const id = createNodeId(
          `gutenberg-block-${isPreview ? `-preview` : ``}${
            previewPostId ? `-${previewPostId}` : ``
          }-${postId}-${innerLevel}-${index}`
        )

        const blockNode = {
          id,
          internal: {
            type: typenameFromBlockName(block.name),
          },
          ...rest,
          isReusableBlock,
          // gatsby's parent node reference
          parent,
          // serialize attributes (may be useful in theme)
          attributesJSON: JSON.stringify(block.attributes),
          // serialize block type definition from registry
          blockTypeJSON: JSON.stringify(blockTypeByBlockName.get(block.name)),
          // every block further down the line will have reference to parent post
          parentPost___NODE: node.id,
          // block's output including inner blocks
          saveContent: isDynamicBlock
            ? await renderDynamicBlock({ client, blockName: block.name, attributes: block.attributes })
            : await getSaveContent(block),
          isDynamicBlock,
          // we use this field in createCustomResolver to have nice interfaces in graphql types instead of
          // gatsby's default unions
          isPreview,
          previewPostId,
        }

        blockNode.internal.contentDigest = createContentDigest(JSON.stringify(blockNode))

        await createNode(blockNode)

        // recursively source inner blocks and set theit parent node to this node
        const innerBlocksNodes = await sourceBlocks({
          blocks: innerBlocks,
          parent: id,
          postId,
          innerLevel: innerLevel + 1,
          isPreview,
          getSaveContent,
          previewPostId,
        })

        createNodeField({
          node: blockNode,
          name: `innerBlocksNodes`,
          value: innerBlocksNodes.map(child => child.id),
        })

        innerBlocksNodes.forEach(child => {
          createParentChildLink({
            parent: blockNode,
            child,
          })
        })

        return blockNode
      })
    )

  const { sourceNodeFieldName = DEFAULT_SOURCE_NODE_FIELD_NAME } = pluginOptions

  let field = node[sourceNodeFieldName]

  // FIXME: -- start Remove when gatsby-source-experimental detect sourceNodeFieldName

  if (!field) {
    field = Object.keys(node).reduce((maybeObj, key) => {
      if (key.startsWith(sourceNodeFieldName)) {
        const obj = maybeObj || {}

        const newKey = key.replace(new RegExp(`^${sourceNodeFieldName}`), ``)

        obj[`${newKey.charAt(0).toLowerCase()}${newKey.slice(1)}`] = node[key]

        return obj
      }

      return maybeObj
    }, null)
  }

  // FIXME: -- end

  if (field) {
    const { postId, postContent, blocksJSON, slug, link, isPreview = false, previewPostId = null, modifiedTime } = field

    // this is the "master" node containing all root blocks
    // this is needed to be able to have nice interfaces upon querying and hence we can't
    // excent third party schema, our "master" node has reference to it as parent node
    // this will be also useful when using gatsby-source-wordpress later on
    const id = createNodeId(
      `gutenberg-content${isPreview ? `-preview` : ``}${previewPostId ? `-${previewPostId}` : ``}-${postId}`
    )

    // we have our single source of truth stored in gatsby's node
    let blocks

    if (blocksJSON) {
      blocks = JSON.parse(blocksJSON)
    } else {
      const page = await launchGutenberg({ ...options, postId }, pluginOptions)
      blocks = await getParsedBlocks(page, postContent)
    }

    const contentNode = {
      id,
      internal: {
        type: `GutenbergContent`,
      },
      postId,
      slug,
      link,
      isPreview,
      previewPostId,
      modifiedTime,
      parent: node.id,
      blocksJSON: JSON.stringify(blocks),
    }

    contentNode.internal.contentDigest = createContentDigest(JSON.stringify(contentNode))

    await createNode(contentNode)

    const blocksNodes = await sourceBlocks({
      blocks,
      parent: id,
      previewPostId,
      isPreview,
      postId,
      getSaveContent: async source => {
        if (isPreview) {
          return source.saveContent
        }
        const page = await launchGutenberg({ ...options, postId }, pluginOptions)
        return getSaveContent(page, source)
      },
    })

    createNodeField({
      node: contentNode,
      name: `blocksNodes`,
      value: blocksNodes.map(child => child.id),
    })

    blocksNodes.forEach(child => {
      createParentChildLink({
        parent: contentNode,
        child,
      })
    })
  }
}

// exports.createResolvers = ({ createResolvers, createContentDigest, createNodeId, actions }, pluginOptions) => {
//   const { createNode } = actions

//   const { sourceNodeFieldName = DEFAULT_SOURCE_NODE_FIELD_NAME } = pluginOptions

//   createResolvers({
//     Query: {
//       sourceWordpressGutenbergPreview: {
//         type: `Boolean!`,
//         args: {
//           data: {
//             type: `String!`,
//           },
//         },
//         resolve: async (source, args) => {
//           const create = async ({ postId, ...rest }) => {
//             const node = {
//               id: createNodeId(`gutenberg-preview-${postId}`),
//               [sourceNodeFieldName]: {
//                 postId,
//                 ...rest,
//                 isPreview: true,
//               },
//               internal: {
//                 type: `GutenbergPreview`,
//               },
//             }

//             node.internal.contentDigest = createContentDigest(JSON.stringify(node))
//             await createNode(node)
//           }

//           const data = JSON.parse(args.data)

//           await Promise.all(
//             Object.keys(data).map(async postId => {
//               const { blocks, blocksByCoreBlockId, link, slug } = data[postId]

//               await Promise.all(
//                 Object.keys(blocksByCoreBlockId).map(coreBlockPostId =>
//                   create({
//                     postId: parseInt(postId),
//                     blocksJSON: JSON.stringify(blocksByCoreBlockId[coreBlockPostId]),
//                   })
//                 )
//               )

//               await create({ postId: parseInt(postId), blocksJSON: JSON.stringify(blocks), link, slug })
//             })
//           )

//           return true
//         },
//       },
//     },
//   })
// }

exports.createPages = async options => {
  // we can close out headless browser for now
  // it will be opened upon new node creation again
  await closeGutenberg(options)
}

exports.onCreateDevServer = (options, pluginOptions) => {
  const { app, store } = options

  // const {
  //   program: { host, port, keyFile },
  // } = store.getState()

  // const url = new URL(`${keyFile ? `https` : `http`}://${host}:${port}`)

  // const proxyMiddleware = proxy({
  //   changeOrigin: true,
  //   xfwd: true,
  //   target: pluginOptions.uri,
  //   headers: {
  //     "X-Gatsby-Wordpress-Gutenberg-Preview-Url": url.origin,
  //   },
  // })

  // app.use(`/wp*`, proxyMiddleware)

  app.post(`/___gutenberg/refresh`, (req, res) => {
    console.log(options)

    res.send()
  })
}
