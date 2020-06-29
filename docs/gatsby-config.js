module.exports = {
  siteMetadata: {
    title: `GatsbyWPGutenberg Docs`,
    description: `GatsbyWPGutenberg documentation.`,
  },
  plugins: [
    {
      resolve: `gatsby-theme-apollo-docs`,
      options: {
        // defaultVersion: `0.1 Beta`,
        // versions: {
        //   "0.1 Beta": `version-0.1`,
        // },
        // algoliaApiKey: `4575706171508518950c4bf031729fc9`,
        // algoliaIndexName: `wpgg`,
        siteName: `GatsbyWPGutenberg Docs`,
        menuTitle: `GatsbyWPGutenberg Menu`,
        subtitle: `GatsbyWPGutenberg`,
        baseUrl: `https://gatsbywpgutenberg.netlify.app`,
        root: __dirname,
        description: `GatsbyWPGutenberg documentation`,
        githubRepo: `GatsbyWPGutenberg/gatsby-wordpress-gutenberg/docs`,
        logoLink: `https://gatsbywpgutenberg.netlify.app`,
        navConfig: {
          Docs: {
            url: `https://gatsbywpgutenberg.netlify.app`,
            description: `The GatsbyWPGutenberg docs`,
          },
          Github: {
            url: `https://github.com/GatsbyWPGutenberg`,
            description: `GatsbyWPGutenberg on Github`,
          },
        },
        // footerNavConfig: {
        //   SomeFooterLink: {
        //     href: `https://github.com/wpgg`,
        //     target: `_blank`,
        //     rel: `noopener noreferrer`,
        //   },
        // },
        sidebarCategories: {
          null: [`index`],
          "Get started": [`installation/packages`, `installation/installation`, `installation/quickstart`],
          Overview: [`overview/sourcing`, `overview/theme`],
          Features: [`features/blocks`, `features/page-templates`, `features/previews`],
          "Example Project": [`example/example`],
          Contributing: [`contributing/contributing`],
          "API Reference": [`api/api`],
        },
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 800,
            },
          },
        ],
      },
    },
    `gatsby-plugin-preval`,
  ],
}
