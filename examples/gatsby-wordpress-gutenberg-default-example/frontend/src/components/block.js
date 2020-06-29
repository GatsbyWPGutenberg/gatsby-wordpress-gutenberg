import React from "react"
import { graphql } from "gatsby"
import { Tooltip } from "@rmwc/tooltip"

import "@rmwc/tooltip/styles"

export const query = graphql`
  fragment Block on WpBlock {
    name
  }
`

export default function Block({ name, children }) {
  return <Tooltip content={name}>{children}</Tooltip>
}
