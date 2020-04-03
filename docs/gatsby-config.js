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
          Packages: [`packages/introduction`, `packages/sourcing`, `packages/theme`],
          Installation: [`installation/installation`],
          Blocks: [`blocks/introduction`, `blocks/shadowing`, `blocks/create`, `blocks/plugins`, `blocks/tutorial`],
          "Page Templates": [
            `page-templates/introduction`,
            `page-templates/query-data`,
            `page-templates/tutorial`,
            `page-templates/opting-out`,
          ],
          Previews: [`previews/introduction`, `previews/page-previews`, `previews/block-previews`],
          "Example Project": [`contributing/contributing`],
          Contributing: [`contributing/contributing`],
          "API Reference": [`api/tbd`],
        },
      },
    },
    `gatsby-plugin-preval`,
  ],
}
