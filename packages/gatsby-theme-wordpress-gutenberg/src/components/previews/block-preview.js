import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"

export default ({ Blocks }) => {
  const [el, setEl] = useState(null)
  const [previewUUID, setPreviewUUID] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const style = document.createElement("style")
    const div = document.createElement("div")
    div.setAttribute("id", "gatsby-gutenberg-block-preview")

    style.innerHTML = `
        .gatsby-theme-wordpress-gutenberg--hidden {
            display: none;
        }
        `
    document.head.appendChild(style)

    const elements = []

    document.body.childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add("gatsby-theme-wordpress-gutenberg--hidden")
        elements.push(node)
      }
    })

    document.body.appendChild(div)

    setPreviewUUID(params.get("previewUUID"))
    setEl(div)

    return () => {
      if (div.parentNode) {
        div.parentNode.removeChild(div)
      }

      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }

      elements.forEach(element => {
        element.classList.remove("gatsby-theme-wordpress-gutenberg--hidden")
      })
    }
  }, [])

  if (!el || !previewUUID) {
    return null
  }

  return createPortal(Blocks ? <Blocks previewUUID={previewUUID} /> : null, el)
}
