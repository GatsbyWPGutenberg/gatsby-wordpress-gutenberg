const { ApolloClient } = require(`apollo-client`)
const { HttpLink } = require(`apollo-link-http`)
const { ApolloLink } = require(`apollo-link`)
const { InMemoryCache } = require(`apollo-cache-inmemory`)
const fetch = require(`node-fetch`)

const puppeteer = require(`puppeteer`)
const { pascalize } = require(`humps`)
// const proxy = require(`http-proxy-middleware`)

const { fetchDynamicBlockNames, fetchFirstGutenbergPost, renderDynamicBlock } = require(`./gatsby-gutenberg`)
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

/**
 * Here are some terms which developer needs to understand about gutenberg and this plugin
 *
 * - gutenberg is some sort of react/redux like post content editor application
 *
 * - the content of the block is stored structuraly in the post content using html comments to provide
 *   information about the block
 *
 * - reusable block - is a block which can be reused between posts, the content of this block
 *   is stored in the wordpress database under wp_block custom post type
 *
 * - dynamic block - is a block which outputs content dynamically through php (server side render)
 *
 * - gutenberg does not have server side block type registry, the registry lives in the browser's memory
 *
 * - our node model looks something like this:
 *   - GutenbergContent => generic node which stores generic information about the post
 *      - there is one GutenbergContent node per stored post content and one per preview content per wordpress post
 *      - the node provides 'blocks' field which represents array of GutenbergBlock nodes
 *      - there is parent/child gatsby's node relationship between GutenbergBlock nodes and GutenbergContent node
 *      - there is parent/child gatsby's node relationship between GutenbergContent node and node which it was sourced from
 *   - GutenbergBlock => graphql interface which represents block
 *      - the node provides 'innerBlocks' fields which represents inner array of GutenbergBlock nodes
 *      - there is parent/child gatsby's node relationship between GutenbergBlock node and innerBlocks nodes
 */

/**
 * CONSTANTS
 */

// field name exposed through wp-graphql from our counterpart plugin
const DEFAULT_SOURCE_NODE_FIELD_NAME = `gutenberg`

// common fields used in block interface/object graphql type
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
      // core/block represents reusable block
      // our source plugin mimics the same db model so the the content of
      // the reusable block is stored in its own node
      if (source.name === `core/block`) {
        // we will distinguish between preview content and non preview content (they are stored in different nodes)
        // the core/block storess reference to the wp_block custom post type in its ref attribute

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

/**
 * MODULE VARIABLES
 */

// object to store promises which we don't want to await right away
const jobs = {}

// variables to store data between gatsby's lifecycles
const blockTypeByBlockName = new Map()
let dynamicBlockNames
let client

/**
 * UTILITY FUNCTIONS
 */

// converts wp block name to graphql type name
const typenameFromBlockName = blockName => {
  const split = blockName.split(`/`)
  return `${split.map(pascalize).join(``)}GutenbergBlock`
}

// launches gutenberg in headless browser and saves reference to the page for reuse
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

/**
 * GATSBY'S LIFECYCLE
 */

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

  // represents block interface type
  // so we can easily query all blocks
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
    // at first, we will launch gutenberg with random post id and get block registry
    // then we can create proper types in gatsby for all block types
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

  // FIXME: -- start
  // Remove this code when gatsby-source-experimental detects sourceNodeFieldName

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

  // the plugin tries to be independent from underlying source plugins, so we only check for field provided by our wordpress plugin
  // this way we can also backport some features to be usable with gatsby-source-wordpress@v3
  if (field) {
    const { postId, postContent, blocksJSON, slug, link, isPreview = false, previewPostId = null, modifiedTime } = field

    // this is the "master" node containing all root blocks
    // this is needed to be able to have nice interfaces upon querying and hence we can't
    // excent third party schema, our "master" node has reference to it as parent node
    // this will be also useful when using gatsby-source-wordpress later on

    // our wordpress plugin stores preview content in its own custom post type
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

    // this field is used in resolver in GutenbergContent type definition
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

exports.createPages = async options => {
  // we can close out headless browser for now
  // it will be opened upon new node creation again when needed
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
    // TODO: add code to manually run sourcing again
    // this should be independent from used source plugins
    // callback should be provided by plugin config, suited for different sourcing plugins
    // we can provide defaults for gastby-source-wordpress-experimental

    res.send()
  })
}
