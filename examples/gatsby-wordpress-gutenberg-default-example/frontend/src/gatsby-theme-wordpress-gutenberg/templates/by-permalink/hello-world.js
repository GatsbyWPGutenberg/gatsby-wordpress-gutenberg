import React from "react"
import { graphql } from "gatsby"

export const query = graphql`
  fragment HelloWorld on Query {
    gutenbergPost(postId: { eq: $postId }) {
      contentNode {
        slug
        ... on WP_NodeWithTitle {
          title
        }
      }
    }
  }
`

export default ({ data, children }) => (
  <>
    <pre>This is post with hello-world permalink, it also has fragment on Query</pre>
    <h1>{data.gutenbergPost.contentNode.title}</h1>
    <h2>Props (note the data taken from wp-graphql):</h2>
    <pre>{JSON.stringify(data, null, 2)}</pre>
    <h2>and the blocks are</h2>
    {children}
  </>
)
