const { default: pluck } = require(`graphql-tag-pluck`)
const { parse, Kind } = require(`graphql`)
const path = require(`path`)
const fs = require(`fs-extra`)
const { pascalize } = require(`humps`)
const chokidar = require(`chokidar`)

const PLUGIN_NAME = require(`./package.json`).name

const fetchAllGutenbergContent = async ({ graphql }) => {
  const { data, errors } = await graphql(`
    query {
      allGutenbergContent {
        edges {
          node {
            id
            parent {
              ... on GutenbergPost {
                postId
                permalink
              }
            }
            blocks {
              __typename
              ... on GutenbergBlock {
                name
                id
              }
              innerBlocks {
                __typename
                ... on GutenbergBlock {
                  name
                  id
                }
              }
            }
          }
        }
      }
    }
  `)

  if (errors) {
    throw errors[0]
  }

  return data
}

const fetchInnerBlocks = async ({ graphql, block: { __typename, id } }) => {
  const field = __typename.charAt(0).toLowerCase() + __typename.slice(1)

  const { data, errors } = await graphql(`
    query {
      ${field}(id: {eq: "${id}"}) {
        innerBlocks {
          __typename
          ... on GutenbergBlock {
            name
            id
          }
        }
      }
    }
  `)

  if (errors) {
    throw errors[0]
  }

  return data[field]
}

const createFragment = ({ name, blockFragmentNames, innerBlocksLevel }) => {
  const spreads = blockFragmentNames.map(blockFragmentName => `...${blockFragmentName}`).join(` `)

  const generate = (level = 0) => {
    let fragment =
      level === 0 ? `{ __typename id ${spreads} ` : ` innerBlocks { __typename ... on GutenbergBlock { id } ${spreads}`

    if (level < innerBlocksLevel) {
      fragment += generate(level + 1)
    }

    fragment += ` }`

    return fragment
  }

  return `fragment ${name} on GutenbergBlock ${generate()}`
}

const createBlocksComponentSource = ({ blockTypenameByName, componentPathByName, sdl }) => `/* eslint-disable */
/* Warning: this file is autogerated, any changes would be lost */

import React from 'react'
import { graphql } from 'gatsby'

${Array.from(blockTypenameByName.entries())
  .map(([blockName, blockTypename]) => `import ${blockTypename} from '${componentPathByName.get(blockName)}'`)
  .join(`\n`)}

export const query = graphql\`${sdl}\`

const Blocks = ({blocks}) => {
  return (
    <>
      {blocks.map((block, i) => {  
        const children = block.innerBlocks ? <Blocks blocks={block.innerBlocks} /> : null;

        ${Array.from(blockTypenameByName.entries())
          .map(
            ([, blockTypename]) => `if (block.__typename === '${blockTypename}') {
            return <${blockTypename} {...block} children={children} key={block.id} />
          }`
          )
          .join(`\n        `)}
         
        return null;
      })}
    </>
  );
};

export default Blocks
`

const createPageComponentSource = ({
  id,
  postId,
  blocksFragmentName,
  blocksComponentPath,
  templateComponentPath,
  templateComponentFragmentName,
}) => `/* eslint-disable */
/* Warning: this file is autogerated, any changes would be lost */
import React from 'react'
import { graphql } from 'gatsby'
import Blocks from '${blocksComponentPath}'
import PageTemplate from '${templateComponentPath}'

export const pageQuery = graphql\`
  query GetGutenbergContent${postId}($postId: Int!) {
    gutenbergPost(postId: {eq: $postId}) {
      childGutenbergContent {
        blocks {
          ...${blocksFragmentName}
        }
      }
    }
    ${templateComponentFragmentName ? `...${templateComponentFragmentName}` : ``}
  }\`

const Page = props =>
  <PageTemplate {...props}>
    <Blocks blocks={props.data.gutenbergPost.childGutenbergContent.blocks} />
  </PageTemplate>

export default Page
`

const resolveComponentPath = async ({ store, componentPath }) => {
  const extensions = store.getState().program.extensions
  const projectRoot = store.getState().program.directory

  const pluginPaths = store.getState().flattenedPlugins.map(flattenedPlugin => {
    if (flattenedPlugin.name === PLUGIN_NAME) {
      return path.join(flattenedPlugin.pluginFilepath, `src`)
    }

    return path.join(flattenedPlugin.pluginFilepath, `src`, `gatsby-theme-wordpress-gutenberg`)
  })

  const dirs = Array.from(new Set([projectRoot, ...[...pluginPaths].reverse()]))

  for (const dir of dirs) {
    const possiblePath = path.join(dir, componentPath)

    let exists = await fs.exists(possiblePath)

    if (exists) {
      return path
    }

    for (const extension of extensions) {
      const possiblePathWithExtension = `${possiblePath}${extension}`

      exists = await fs.exists(possiblePathWithExtension)
      if (exists) {
        return possiblePathWithExtension
      }
    }
  }

  return null
}

const resolveTemplateComponentPath = async ({ store, postId, permalink }) =>
  (await resolveComponentPath({ store, componentPath: path.join(`templates`, `${postId}`) })) ||
  (await resolveComponentPath({
    store,
    componentPath: path.join(`templates`, new URL(permalink).pathname.replace(/\//g, `-`)),
  })) ||
  (await resolveComponentPath({
    store,
    componentPath: path.join(`templates`, `index`),
  }))

const extractGraphql = async ({ componentPath }) => {
  try {
    const sdl = await pluck.fromFile(componentPath, {
      modules: [
        {
          name: `gatsby`,
          identifier: `graphql`,
        },
      ],
    })

    return parse(sdl)
  } catch (err) {
    return null
  }
}

const writeFile = async ({ filePath, data }) => {
  const oldData = await fs.readFile(filePath, `utf-8`).catch(() => null)

  if (oldData !== data) {
    await fs.outputFile(filePath, data)
  }
}

const processContent = async (options, pluginOptions) => {
  const { graphql, actions, reporter, store } = options

  const { program } = store.getState()
  const { createPage } = actions

  const { allGutenbergContent } = await fetchAllGutenbergContent({ graphql })

  if (allGutenbergContent.edges.length) {
    const componentPathByName = new Map()
    const unknownBlockComponentPath = await resolveComponentPath({
      ...options,
      componentPath: path.join(`components`, `unknown-block`),
    })

    await Promise.all(
      allGutenbergContent.edges.map(async ({ node }) => {
        const {
          blocks,
          parent: { postId, permalink },
          id,
        } = node

        const blockTypenameByName = new Map()
        let innerBlocksLevel = 0

        const visitInnerBlock = async ({ innerBlock, currentInnerBlocksLevel }) => {
          const { name } = innerBlock

          innerBlocksLevel = Math.max(currentInnerBlocksLevel, innerBlocksLevel)
          blockTypenameByName.set(name, innerBlock.__typename)

          const { innerBlocks } = await fetchInnerBlocks({ graphql, block: innerBlock })

          await Promise.all(
            innerBlocks.map(async innerBlock => {
              await visitInnerBlock({ innerBlock, currentInnerBlocksLevel: currentInnerBlocksLevel + 1 })
            })
          )
        }

        await Promise.all(
          blocks.map(async block => {
            blockTypenameByName.set(block.name, block.__typename)

            await Promise.all(
              block.innerBlocks.map(async innerBlock => {
                await visitInnerBlock({ innerBlock, currentInnerBlocksLevel: 1 })
              })
            )
          })
        )

        const blockFragmentNames = new Set()

        await Promise.all(
          Array.from(blockTypenameByName.keys()).map(async blockName => {
            if (!componentPathByName.has(blockName)) {
              const possibleComponentPath = await resolveComponentPath({
                ...options,
                componentPath: path.join(`components`, `blocks`, blockName),
              })

              componentPathByName.set(blockName, possibleComponentPath || unknownBlockComponentPath)
            }

            const componentPath = componentPathByName.get(blockName)
            const document = await extractGraphql({ componentPath })

            if (document) {
              let fragment

              document.definitions.forEach(d => {
                if (d.kind === Kind.FRAGMENT_DEFINITION) {
                  if (fragment) {
                    throw new Error(
                      `GraphQL Error: Component \`${componentPath}\` must contain only one fragment definition`
                    )
                  }

                  fragment = d
                }
              })

              blockFragmentNames.add(fragment.name.value)
            } else {
              reporter.warn(`Fragment definition in \`${componentPath}\` not found`)
            }
          })
        )

        const fragmentName = `GutenbergBlocks${postId}`

        const fragments = [
          createFragment({
            name: fragmentName,
            blockFragmentNames: Array.from(blockFragmentNames),
            innerBlocksLevel,
          }),
          createFragment({
            name: `GutenbergBlocks${pascalize(new URL(permalink).pathname.replace(/(^\/|\/$)/g, ``))}`,
            blockFragmentNames: Array.from(blockFragmentNames),
            innerBlocksLevel,
          }),
        ]

        const blocksComponentPath = path.join(program.directory, `src`, PLUGIN_NAME, `blocks`, `${postId}.js`)

        await writeFile({
          filePath: blocksComponentPath,
          data: createBlocksComponentSource({
            sdl: fragments.join(` `),
            blockTypenameByName,
            componentPathByName,
          }),
        })

        const templateComponentPath = await resolveTemplateComponentPath({
          ...options,
          postId,
          permalink,
        })

        const document = await extractGraphql({ componentPath: templateComponentPath })

        let templateComponentFragment = null

        if (document) {
          document.definitions.forEach(d => {
            if (d.kind === Kind.FRAGMENT_DEFINITION) {
              if (templateComponentFragment || d.typeCondition.name.value !== `Query`) {
                throw new Error(
                  `GraphQL Error: Template \`${templateComponentFragment}\` must contain only one fragment definition on Query type.`
                )
              }

              templateComponentFragment = d
            }
          })
        }

        const pageComponentPath = path.join(program.directory, `src`, PLUGIN_NAME, `pages`, `${postId}.js`)

        await writeFile({
          filePath: pageComponentPath,
          data: createPageComponentSource({
            id,
            postId,
            blocksFragmentName: fragmentName,
            blocksComponentPath,
            templateComponentPath,
            templateComponentFragmentName: templateComponentFragment && templateComponentFragment.name.value,
          }),
        })

        await createPage({
          component: pageComponentPath,
          path: new URL(permalink).pathname,
          context: {
            postId,
          },
        })
      })
    )
  }
}

let watcher

exports.createPages = async (options, pluginOptions) => {
  await processContent(options, pluginOptions)
}

exports.createPagesStatefully = (options, pluginOptions) => {
  if (process.env.NODE_ENV === `development`) {
    if (watcher) {
      return
    }

    const { store, reporter } = options

    const program = store.getState().program
    const exts = program.extensions.map(e => `${e.slice(1)}`).join(`,`)

    const cb = () => {
      if (cb.current) {
        return
      }
      reporter.info(`refreshing gutenberg pages`)
      cb.current = processContent(options, pluginOptions)
        .catch(err => {
          reporter.error(err)
        })
        .finally(() => {
          cb.current = null
        })
    }

    watcher = chokidar
      .watch([
        store.getState().flattenedPlugins.map(flattenedPlugin => {
          const directoryPath = flattenedPlugin.pluginFilepath
          return `${directoryPath}/${
            flattenedPlugin.name === PLUGIN_NAME ? `src/` : `src/gatsby-theme-wordpress-gutenberg/`
          }{components,templates}/**/*.{${exts}}`
        }),
      ])
      .on(`all`, cb)
  }
}
