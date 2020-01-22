const gql = require(`graphql-tag`)

// Contains functions to fetch data from our counterpart WP plugin Gatsby Gutenberg

const fetchAllGutenbergPosts = async ({ client, first, after }) => {
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

const fetchDynamicBlockNames = async ({ client }) => {
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

const renderDynamicBlock = async ({ client, blockName, attributes }) => {
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

module.exports = {
  fetchAllGutenbergPosts,
  fetchDynamicBlockNames,
  renderDynamicBlock,
}
