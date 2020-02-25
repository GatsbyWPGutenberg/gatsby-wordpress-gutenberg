/**
 * WordPress dependencies
 */
import { useEffect, useContext, createContext } from "@wordpress/element"
import { useRegistry, useDispatch, useSelect } from "@wordpress/data"
import { addFilter } from "@wordpress/hooks"

// import { registerPlugin } from "@wordpress/plugins"
// import { PluginPostPublishPanel } from "@wordpress/edit-post"

import store from "./store"
import { sendPreview } from "./gatsby"

const CoreBlockContext = createContext(null)

store.subscribe(() => {
  sendPreview({
    // client,
    state: store.getState(),
  })
})

addFilter(`editor.BlockEdit`, `plugin-wp-gatsby-gutenberg-preview/BlockEdit`, Edit => {
  return props => {
    const registry = useRegistry()
    const blocks = registry.select(`core/block-editor`).getBlocks()
    const coreBlock = useContext(CoreBlockContext)
    const id = useSelect(select => {
      return select(`core/editor`).getCurrentPostId()
    })
    const slug = useSelect(select => {
      return select(`core/editor`).getEditedPostAttribute(`slug`)
    })

    const link = useSelect(select => {
      return select(`core/editor`).getEditedPostAttribute(`link`)
    })

    const { setBlocks } = useDispatch(`wp-gatsby-gutenberg/preview`)
    const coreBlockId = (coreBlock && coreBlock.attributes.ref && parseInt(coreBlock.attributes.ref, 10)) || null

    useEffect(() => {
      if (id) {
        setBlocks({ id, blocks, coreBlockId, slug, link })
      }
    }, [blocks, coreBlockId, id])

    if (props.name === `core/block`) {
      return (
        <CoreBlockContext.Provider value={props}>
          <Edit {...props}></Edit>
        </CoreBlockContext.Provider>
      )
    }

    return <Edit {...props} />
  }
})

// const GatsbyWordpressGutenbergPreview

// const GatsbyWordpressGutenbergPreview = () => {

//   useEffect(() => {})

//   return null
// }

// registerPlugin(`plugin-wp-gatsby-gutenberg-preview`, { render: GatsbyWordpressGutenbergPreview })