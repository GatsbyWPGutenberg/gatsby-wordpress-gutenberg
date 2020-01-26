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
  fetchAllGutenbergPosts,
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

exports.createSchemaCustomization = async (options, pluginOptions) => {
  const { actions, schema } = options

  const { createTypes } = actions

  createTypes(
    schema.buildInterfaceType({
      name: `GutenbergBlock`,
      fields: BLOCK_INTERFACE_FIELDS,
    })
  )

  const contentTypenames = [`GutenbergContent`, `GutenbergPreviewContent`]

  contentTypenames.forEach(name => {
    createTypes(
      schema.buildObjectType({
        name,
        fields: {
          blocks: {
            type: `[GutenbergBlock!]!`,
            resolve: (source, args, context, info) =>
              source.blocksNodes.map(id => context.nodeModel.getNodeById({ id })),
          },
          blocksJSON: {
            type: `String!`,
            description: `Serialized parsed blocks in JSON format`,
          },
        },
        interfaces: [`Node`],
      })
    )
  })

  createTypes(
    schema.buildObjectType({
      name: `GutenbergPost`,
      fields: {
        postId: {
          type: `Int!`,
        },
        gutenbergContent: {
          type: `GutenbergContent`,
          resolve: (source, args, context, info) => {
            const id = source.fields && source.fields.gutenbergContent___NODE

            if (id) {
              return context.nodeModel.getNodeById({ id })
            }

            return null
          },
        },
        gutenbergPreviewContent: {
          type: `GutenbergPreviewContent`,
          resolve: (source, args, context, info) => {
            const id = source.fields && source.fields.gutenbergPreviewContent___NODE

            if (id) {
              return context.nodeModel.getNodeById({ id })
            }

            return null
          },
        },
      },
      interfaces: [`Node`],
    })
  )

  blockTypeByBlockName.clear()
  const post = await fetchFirstGutenbergPost({ client })

  if (post) {
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

  // we should depracate this upon new gatsby-source-wordpress and use native sources instead
  const posts = await fetchAllGutenbergPosts({ client, first: 100 })

  // refetch/reset mappings
  dynamicBlockNames = await fetchDynamicBlockNames({ client })

  postByPostId.clear()

  posts.forEach(post => {
    postByPostId.set(post.postId, post)
  })

  await Promise.all(
    posts.map(async (post, index) => {
      const { id, ...rest } = post

      const node = {
        ...rest,
        id: createNodeId(`gutenberg-post-${id}`),
        internal: {
          type: `GutenbergPost`,
        },
      }

      node.internal.contentDigest = createContentDigest(JSON.stringify(node))

      await createNode(node)
    })
  )
}

exports.onCreateNode = async (options, pluginOptions) => {
  const {
    node,
    actions: { createNode, createParentChildLink, createNodeField },
    createContentDigest,
    createNodeId,
    getNodesByType,
  } = options

  const sourceBlocks = async ({
    blocks,
    parent,
    innerLevel = 0,
    nodeIdPrefix,
    getReusableBlockBlocks,
    getSaveContent,
  }) =>
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

          const reusableBlockBlocks = await getReusableBlockBlocks(block.attributes.ref)
          source = reusableBlockBlocks[0]
          isReusableBlock = true

          // core/block is for some reason also present in dynamic blocks
          isDynamicBlock = false
        }

        const { innerBlocks, ...rest } = source

        // block's clientId property is not consistent
        // so we use blocks position in nested array as its id
        const id = createNodeId(`${nodeIdPrefix}-${node.postId}-${innerLevel}-${index}`)

        // recursively source inner blocks and set theit parent node to this node
        const innerBlocksNodes = await sourceBlocks({
          blocks: innerBlocks,
          parent: id,
          innerLevel: innerLevel + 1,
          nodeIdPrefix,
          getReusableBlockBlocks,
          getSaveContent,
        })

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
          saveContent: await getSaveContent(source),
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

  if (node.internal.type === `GutenbergPost`) {
    const page = await launchGutenberg({ ...options, postId: node.postId }, pluginOptions)

    // this is the "master" node containing all root blocks
    // this is needed to be able to have nice interfaces upon querying and hence we can't
    // excent third party schema, our "master" node has reference to it as parent node
    // this will be also useful when using gatsby-source-wordpress later on
    const id = createNodeId(`gutenberg-content-${node.postId}`)

    // we have our single source of truth stored in gatsby's node
    const blocks = await getParsedBlocks(page, node.postContent)
    const blocksNodes = await sourceBlocks({
      blocks,
      parent: id,
      nodeIdPrefix: `gutenberg-block`,
      getReusableBlockBlocks: ref => getParsedBlocks(page, postByPostId.get(ref).postContent),
      getSaveContent: source => getSaveContent(page, source),
    })

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

    createNodeField({
      node,
      name: `gutenbergContent___NODE`,
      value: id,
    })
  }

  if (node.internal.type === `GutenbergPreview`) {
    const id = createNodeId(`gutenberg-preview-content-${node.postId}`)

    const { blocks, blocksByCoreBlockId } = JSON.parse(node.data)

    const blocksNodes = await sourceBlocks({
      blocks,
      parent: id,
      nodeIdPrefix: `gutenberg-preview-block`,
      getReusableBlockBlocks: ref => blocksByCoreBlockId[ref],
      getSaveContent: source => source.saveContent,
    })

    const contentNode = {
      id,
      internal: {
        type: `GutenbergPreviewContent`,
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

    const gutenbergPostNodes = getNodesByType(`GutenbergPost`)

    for (const gutenbergPostNode of gutenbergPostNodes) {
      if (gutenbergPostNode.postId === node.postId) {
        createNodeField({
          node: gutenbergPostNode,
          name: `gutenbergPreviewContent___NODE`,
          value: id,
        })

        break
      }
    }
  }
}

exports.createResolvers = ({ createResolvers, createContentDigest, createNodeId, actions }, pluginOptions) => {
  const { createNode } = actions

  createResolvers({
    Query: {
      sourceWordpressGutenbergPreview: {
        type: `Boolean!`,
        args: {
          data: {
            type: `String!`,
          },
        },
        resolve: async (source, args) => {
          const data = JSON.parse(args.data)

          await Promise.all(
            Object.keys(data).map(async postId => {
              const node = {
                id: createNodeId(`gutenberg-preview-${postId}`),
                postId: parseInt(postId, 10),
                data: JSON.stringify(data[postId]),
                internal: {
                  type: `GutenbergPreview`,
                },
              }

              node.internal.contentDigest = createContentDigest(JSON.stringify(node))
              await createNode(node)
            })
          )

          return true
        },
      },
    },
  })
}

exports.createPages = async options => {
  // we can close out headless browser for now
  // it will be opened upon new node creation again
  await closeGutenberg(options)
}

// exports.onCreateDevServer = (options, pluginOptions) => {
//   const { app, store } = options

//   const {
//     program: { host, port, keyFile },
//   } = store.getState()

//   const url = new URL(`${keyFile ? `https` : `http`}://${host}:${port}`)

//   const proxyMiddleware = proxy({
//     changeOrigin: true,
//     xfwd: true,
//     target: pluginOptions.uri,
//     headers: {
//       "X-Gatsby-Wordpress-Gutenberg-Preview-Url": url.origin,
//     },
//   })

//   app.use(`/wp*`, proxyMiddleware)
// }
