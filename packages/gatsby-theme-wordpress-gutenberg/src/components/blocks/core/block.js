import { graphql } from "gatsby"

export const query = graphql`
  fragment ThemeWordpressGutenbergCoreBlock on WpCoreBlock {
    __typename
  }
`
const CoreBlock = ({ children }) => {
  return children
}

export default CoreBlock
