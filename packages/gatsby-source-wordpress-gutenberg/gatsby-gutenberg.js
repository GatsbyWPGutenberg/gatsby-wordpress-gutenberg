/**
 Contains functions to fetch data from our counterpart WP plugin Gatsby Gutenberg
 */

const gql = require(`graphql-tag`)

const fetchFirstGutenbergPost = async ({ client, fieldName }) => {
  const { data, errors } = await client.query({
    query: gql`
      query GetFirstGutenbergPost {
        gutenbergPosts(first: 1) {
          edges {
            node {
              postId: gutenbergPostId
            }
          }
        }
      }
    `,
  })

  if (errors && errors) {
    throw errors[0]
  }

  return data.gutenbergPosts.edges.length && data.gutenbergPosts.edges[0].node
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
  fetchFirstGutenbergPost,
  fetchDynamicBlockNames,
  renderDynamicBlock,
}
