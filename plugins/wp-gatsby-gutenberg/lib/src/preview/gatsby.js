import { getSaveContent } from "@wordpress/blocks"
import { debounce } from "lodash"
// import { ApolloClient } from "apollo-client"
// import { HttpLink } from "apollo-link-http"
// import { ApolloLink } from "apollo-link"
// import { InMemoryCache } from "apollo-cache-inmemory"
// import gql from "graphql-tag"
import apiFetch from "@wordpress/api-fetch"

// export const createClient = ({ previewUrl }) => {
//   const url = new URL(previewUrl)

//   url.pathname += `___graphql`

//   return new ApolloClient({
//     link: ApolloLink.from([
//       new HttpLink({
//         uri: url.href,
//       }),
//     ]),
//     // disables all caching whatsoever
//     defaultOptions: {
//       query: {
//         fetchPolicy: `network-only`,
//         errorPolicy: `all`,
//       },
//     },
//     cache: new InMemoryCache(),
//   })
// }

const visitBlocks = (blocks, visitor) => {
  blocks.forEach(block => {
    visitor(block)

    if (block.innerBlocks) {
      visitBlocks(block.innerBlocks, visitor)
    }
  })

  return blocks
}

const visitor = block => {
  block.saveContent = getSaveContent(block.name, block.attributes, block.innerBlocks)
}

export const sendPreview = debounce(({ client, state }) => {
  const data = JSON.parse(JSON.stringify(state))

  Object.keys(data).forEach(id => {
    const { blocks, blocksByCoreBlockId } = data[id]

    visitBlocks(blocks, visitor)
    Object.keys(blocksByCoreBlockId).forEach(coreBlockId => {
      visitBlocks(blocksByCoreBlockId[coreBlockId], visitor)
    })
  })

  apiFetch({
    path: `/gatsby-gutenberg/v1/previews/batch`,
    method: `POST`,
    data: { batch: data },
  })
    .then(console.log)
    .catch(console.error)

  // client.query({
  //   query: gql`
  //     query SourceWordpressGutenbergPreview($data: String!) {
  //       sourceWordpressGutenbergPreview(data: $data)
  //     }
  //   `,
  //   variables: {
  //     data: JSON.stringify(data),
  //   },
  // })
}, 500)
