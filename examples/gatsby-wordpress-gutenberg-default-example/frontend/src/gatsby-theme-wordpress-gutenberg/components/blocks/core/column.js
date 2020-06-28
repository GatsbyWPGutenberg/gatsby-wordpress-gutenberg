import React, { useContext } from "react"
import { graphql } from "gatsby"
import { GridCell } from "@rmwc/grid"
import { ColumnsContext } from "./columns"

import Block from "../../../../components/block"

import "@rmwc/grid/styles"

export const query = graphql`
  fragment Column on WpCoreColumnBlock {
    ...Block
  }
`

export default function Column(props) {
  const { children, attributes, ...rest } = props
  const { columns } = useContext(ColumnsContext)

  return (
    <GridCell style={{ backgroundColor: "beige" }} span={12 % columns}>
      <Block {...rest}>{children}</Block>
    </GridCell>
  )
}
