module.exports = {
  siteMetadata: {
    title: `WordPress Gutenberg Gatsby documentation`,
    description: `WordPress Gutenberg Gatsby documentation.`,
  },
  plugins: [
    // `gatsby-plugin-react-helmet`,
    // {
    //   resolve: `gatsby-source-filesystem`,
    //   options: {
    //     name: `images`,
    //     path: `${__dirname}/content/images`,
    //   },
    // },
    // `gatsby-transformer-sharp`,
    // `gatsby-plugin-sharp`,
    // {
    //   resolve: `gatsby-plugin-manifest`,
    //   options: {
    //     name: `WordPress Gutenberg Gatsby documentation`,
    //     short_name: `wordpress-gutenberg-gatsby-docs`,
    //     start_url: `/`,
    //     background_color: `#663399`,
    //     theme_color: `#663399`,
    //     display: `minimal-ui`,
    //     icon: `src/images/gatsby-icon.png`, // This path is relative to the root of the site.
    //   },
    // },
    {
      resolve: "gatsby-theme-apollo-docs",
      options: {
        defaultVersion: "0.1 Beta",
        // versions: {
        //   '0.1 Beta': 'version-0.1'
        // },
        algoliaApiKey: '4575706171508518950c4bf031729fc9',
        algoliaIndexName: 'wpgg',
        siteName: "GWG Documentation",
        menuTitle: "GWG Menu",
        subtitle: "GWG Menu",
        baseUrl: "https://wpgg-docs.netlify.com",
        root: __dirname,
        description: "WordPress Gutenberg Gatsby documentation",
        githubRepo: "wpgg-framework/wordpress-gutenberg-gatsby",
        logoLink: "https://docs.mobileui.dev",
        navConfig: {
          "wpgg.netlify.com": {
            url: "https://wpgg.netlify.com",
            description: "The WPGG Framework page",
          },
          Github: {
            url: "https://github.com/wpgg-framework",
            description: "WPGG on Github",
          },
        },
        footerNavConfig: {
          SomeFooterLink: {
            href: "https://github.com/wpgg",
            target: "_blank",
            rel: "noopener noreferrer",
          },
        },
        sidebarCategories: {
          null: [
            "index",
          ],
          "Getting Started": [
            "getting-started/installation",
          ],
        },
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
  ],
}
