module.exports = options => {
  return {
    plugins: [
      {
        resolve: `gatsby-source-wordpress-gutenberg`,
        options,
      },
    ],
  }
}
