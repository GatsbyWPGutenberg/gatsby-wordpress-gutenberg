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
      resolve: `gatsby-source-graphql`,
      options: {
        url: `http://localhost:8020/graphql`,
        typeName: `WP`,
        // Field under which the remote schema will be accessible. You'll use this in your Gatsby query
        fieldName: `wp`,
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
  ],
}
