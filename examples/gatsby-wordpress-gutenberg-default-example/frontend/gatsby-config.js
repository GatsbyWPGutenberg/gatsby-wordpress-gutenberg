require(`dotenv`).config({
  path: `.env.${process.env.NODE_ENV}`,
})

module.exports = {
  siteMetadata: {
    title: `Gatsby Default Starter`,
    description: `Kick off your next, great Gatsby project with this default starter. This barebones starter ships with the main Gatsby configuration files you might need.`,
    author: `@gatsbyjs`,
  },
  plugins: [
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-theme-wordpress-gutenberg`,
      options: {
        uri: `http://localhost:8020`,
        user: `admin`,
        password: `admin`,
      },
    },
    {
      resolve: `gatsby-source-wordpress-experimental`,
      options: {
        url: `http://admin:admin@localhost:8020/graphql`,
        verbose: true,
        // for wp-graphql-gutenberg, attributes currently breaks due
        // to the origin schema. It works if we exclude attributes
        excludeFields: [`attributes`],
        schema: {
          queryDepth: 15,
          typePrefix: `Wp`,
        },
        develop: {
          nodeUpdateInterval: 5000,
        },
        debug: {
          graphql: {
            showQueryOnError: false,
            showQueryVarsOnError: false,
            copyQueryOnError: false,
            panicOnError: false,
          },
        },
        // type:
        //   // Lets just pull 50 posts in development to make it easy on ourselves.
        //   // and we don't actually need more than 5000 in production!
        //   process.env.NODE_ENV === `development`
        //     ? {
        //         Post: {
        //           limit: 50,
        //         },
        //       }
        //     : {
        //         Post: {
        //           limit: 5000,
        //         },
        //       },
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
  ],
}
