const gql = require(`graphql-tag`)

module.exports.fetchAllGutenbergPosts = async ({ client, first, after }) => {
  const posts = []

  const {
    data: { gutenbergPosts },
  } = await client.query({
    query: gql`
      query GetAllGutenbergPosts($first: Int!, $after: String) {
        gutenbergPosts(first: $first, after: $after) {
          edges {
            node {
              __typename
              id
              postId: gutenbergPostId
              postContent: gutenbergPostContent
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    variables: {
      first,
      after,
    },
  })

  gutenbergPosts.edges.forEach(({ node }) => {
    posts.push(node)
  })

  if (gutenbergPosts.pageInfo.hasNextPage) {
    const nextPosts = await fetchAllGutenbergPosts({ client, first, after: gutenbergPosts.pageInfo.endCursor })

    return [...posts, ...nextPosts]
  }

  return posts
}

module.exports.fetchDynamicBlockNames = async ({ client }) => {
  const {
    data: { gutenbergDynamicBlockNames },
  } = await client.query({
    query: gql`
      query GetDynamicBlockNames {
        gutenbergDynamicBlockNames
      }
    `,
  })

  return gutenbergDynamicBlockNames
}

module.exports.renderDynamicBlock = async ({ client, blockName, attributes }) => {
  const {
    data: { gutenbergRenderDynamicBlock },
  } = await client.query({
    query: gql`
      query RenderDynamicBlock($blockName: String!, $attributesJSON: String!) {
        gutenbergRenderDynamicBlock(blockName: $blockName, attributesJSON: $attributesJSON)
      }
    `,
    variables: {
      blockName,
      attributesJSON: JSON.stringify(attributes),
    },
  })

  return gutenbergRenderDynamicBlock
}
