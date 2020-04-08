import { graphql } from "gatsby"

export const query = graphql`
  fragment ThemeWordpressGutenbergCoreBlock on CoreBlockGutenbergBlock {
    isReusableBlock
  }
`
const CoreBlock = ({ children }) => children

export default CoreBlock
