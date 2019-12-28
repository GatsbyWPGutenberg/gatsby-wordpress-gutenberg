const path = require('path');
const { introspectSchema } = require('graphql-tools');
const { HttpLink } = require('apollo-link-http');
const fetch = require('node-fetch');

module.exports = ({ linkOptions }) => {
  const link = new HttpLink({ fetch, ...linkOptions });

  return {
    plugins: [
      {
        resolve: `gatsby-source-filesystem`,
        options: {
          name: `gutenberg-source-components`,
          path: path.join(process.cwd(), 'src', 'gatsby-theme-wp-graphql-gutenberg', 'components'),
        },
      },
      {
        resolve: 'gatsby-source-graphql',
        options: {
          //   typeName: 'Gutenberg',
          //   fieldName: 'gutenberg',
          typeName: 'WP',
          fieldName: 'wp',
          createLink: () => link,
          // createSchema: async () => {
          //   return await introspectSchema(link);
          // },
        },
      },
    ],
  };
};
