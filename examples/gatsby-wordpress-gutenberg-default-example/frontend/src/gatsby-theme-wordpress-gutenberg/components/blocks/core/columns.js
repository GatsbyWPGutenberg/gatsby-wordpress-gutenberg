import React, { useMemo } from "react"
import { graphql } from "gatsby"
import { Grid } from "@rmwc/grid"

import Block from "../../../../components/block"

import "@rmwc/grid/styles"

export const query = graphql`
  fragment Columns on WpCoreColumnsBlock {
    ...Block
  }
`

export const ColumnsContext = React.createContext()

export default function Columns(props) {
  const { children, ...rest } = props

  const value = useMemo(() => {
    const element = React.Children.toArray(children).pop()

    return {
      columns: element?.props?.blocks?.length || 0,
    }
  }, [children])

  return (
    <ColumnsContext.Provider value={value}>
      <Block {...rest}>
        <Grid>{children}</Grid>
      </Block>
    </ColumnsContext.Provider>
  )
}
