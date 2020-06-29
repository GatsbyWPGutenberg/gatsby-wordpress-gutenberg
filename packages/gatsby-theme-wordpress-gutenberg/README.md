# Gatsby Theme WordPress Gutenberg

Use WordPress gutenberg editor as a page builder for your Gatsby site.

## Features

- Render Gutenberg blocks with custom React components
- Live preview in Gatsby and Gutenberg
- Automatic React component generation based on post's content to keep bundle size small

## Example

### Querying

> The `Blocks` component is a component which represents your structured content and is created during build phase. The post content is analyzed for all the blocks it contains and then the components which currently represent each block are consolidated into one component. This way, you only provide your custom implementations for each block and the magic of querying and sticking up the content together is done for you behind the scenes.

```js
import React from "react"
import Layout from "../components/layout"
import { graphql } from "gatsby"

export default function BlogPost({ data }) {
  const post = data.allWpPost.nodes[0]
  console.log(post)
  return (
    <Layout>
      <div>
        <h1>{post.title}</h1>
        {/* Render post.Blocks instead of raw html content */}
        {post.Blocks && <post.Blocks />}
      </div>
    </Layout>
  )
}
export const query = graphql`
  query($slug: String!) {
    allWpPost(filter: { slug: { eq: $slug } }) {
      nodes {
        title
        Blocks ### query component as a graphql field
      }
    }
  }
```

### Custom block implementation

> You can write your own custom block implementation for each block. Otherwise the default `<UnknownBlock />` implementation is used.

An example of custom Paragraph block:

```js
import React from "react"
import { graphql } from "gatsby"

import Block from "../../../../components/block"

import "@rmwc/tooltip/styles"

export const query = graphql`
  fragment Paragraph on WpCoreParagraphBlock {
    ...Block
    attributes {
      ... on WpCoreParagraphBlockAttributes {
        content
        dropCap
        customBackgroundColor
      }
    }
  }
`

export default function Paragraph(props) {
  const { attributes } = props

  return (
    <Block {...props}>
      <p
        style={{
          backgroundColor: attributes.customBackgroundColor || `aliceblue`,
          border: `3px solid rebeccapurple`,
          borderRadius: `5px`,
          padding: 5
        }}
        dangerouslySetInnerHTML={{ __html: attributes.content }}
      />
    </Block>
  )
}
```

<a href="https://www.netlify.com">
  <img src="https://www.netlify.com/img/global/badges/netlify-color-accent.svg"/>
</a>
