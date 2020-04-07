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
        baseUrl: `https://gwpg-docs.netlify.com`,
        root: __dirname,
        description: `GatsbyWPGutenberg documentation`,
        githubRepo: `GatsbyWPGutenberg/gatsby-wordpress-gutenberg/docs`,
        logoLink: `https://gwpg-docs.netlify.com`,
        navConfig: {
          Docs: {
            url: `https://gwpg.netlify.com`,
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
          "Get started": [`installation/packages`, `installation/installation`],
          Overview: [`overview/sourcing`, `overview/theme`],
          Features: [`features/blocks`, `features/page-templates`, `features/previews`],
          "Example Project": [`example/example`],
          Contributing: [`contributing/contributing`],
          "API Reference": [`api/api`],
        },
      },
    },
    `gatsby-plugin-preval`,
  ],
}
