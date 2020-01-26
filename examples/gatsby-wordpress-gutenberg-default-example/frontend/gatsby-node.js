/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

// You can delete this file if you're not using it

const {
  delegateToSchema,
  introspectSchema,
  transformSchema,
  makeRemoteExecutableSchema,
  RenameTypes,
} = require(`graphql-tools`)
const { HttpLink } = require(`apollo-link-http`)
const fetch = require(`node-fetch`)
const jobs = {}

const wpLink = new HttpLink({ uri: `http://localhost:8020/graphql`, fetch })
jobs.wpIntrospectSchema = introspectSchema(wpLink)
jobs.wpRemoteSchema = jobs.wpIntrospectSchema.then(schema =>
  transformSchema(
    makeRemoteExecutableSchema({
      schema,
      link: wpLink,
    }),
    [new RenameTypes(name => `WP_${name}`)]
  )
)

exports.createResolvers = ({ createResolvers }) => {
  const resolvers = {
    GutenbergPost: {
      contentNode: {
        type: `WP_ContentNode`,
        resolve: async (source, args, context, info) => {
          if (source) {
            const { postId } = source

            return await delegateToSchema({
              schema: await jobs.wpRemoteSchema,
              operation: `query`,
              fieldName: `contentNode`,
              args: { id: postId, idType: `DATABASE_ID` },
              context,
              info,
            })
          }
          return null
        },
      },
    },
  }
  createResolvers(resolvers)
}
