import { graphql } from "gatsby"

export const query = graphql`
  fragment CoreParagraphGutenbergBlock on CoreParagraphGutenbergBlock {
    name
  }
`

export default () => null
