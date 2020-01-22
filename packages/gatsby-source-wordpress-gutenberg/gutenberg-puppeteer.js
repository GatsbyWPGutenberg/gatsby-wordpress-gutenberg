// Contains functions to interact with gutenberg through puppeteer (headless browser)

// perform standard login through /wp-login.php
const login = async (browser, url, user, password) => {
  const page = await browser.newPage()

  await page.goto(url)

  // had some race conditions using page.type / page.click
  // instead we set value and submit login form through javascript
  await page.evaluate(
    options => {
      document.querySelector(`form[name="loginform"] input[name="log"]`).value = options.user
      document.querySelector(`form[name="loginform"] input[name="pwd"]`).value = options.password
    },
    { user, password }
  )

  // wordpress responds 200 OK also on failed login
  // so instead we check if we are redirected to the right page after submit
  const redirectTo = await page.evaluate(async () => {
    const formData = new FormData(document.querySelector(`form[name="loginform"]`))
    return formData.get(`redirect_to`)
  })

  await Promise.all([
    page.waitForNavigation({ waitUntil: `networkidle2` }),
    page.evaluate(() => {
      document.querySelector(`form[name="loginform"]`).submit()
    }),
  ])

  const currentUrl = await page.url()

  await page.close()

  if (currentUrl !== redirectTo) {
    throw new Error(`Login failed`)
  }
}

class NotABlockEditorPageError extends Error {}

// opens new page (tab) and checks for gutenberg scripts presence, throws otherwise
const blockEditorPage = async (browser, url) => {
  const isBlockEditorPage = () =>
    document.querySelector(`script[src*="wp-includes"][src*="js"][src*="blocks"]`) !== null

  const page = await browser.newPage(url)
  await page.goto(url, { waitUntil: `networkidle2` })

  if (!(await page.evaluate(isBlockEditorPage))) {
    await page.close()
    throw new NotABlockEditorPageError(`Url '${url}' is not a block editor page.`)
  }

  return page
}
// waits upon gutenberg initialization (block library)
const blockEditorReady = async page => {
  await page.evaluate(async () => {
    // taken from wp-admin/edit-form-blocks.php
    await window._wpLoadBlockEditor
  })
}

// closes editor on admin page
// useful to turn off unexpected autoupdates of the opened post
const closeEditor = async page => {
  await blockEditorReady(page)
  await page.evaluate(async () => {
    // inspired from https://github.com/WordPress/gutenberg/blob/master/packages/edit-post/src/index.js
    await window.wp.element.unmountComponentAtNode(document.querySelector(`#editor`))
  })
}

// get block type registry
const getBlockTypes = async page => {
  await blockEditorReady(page)

  return await page.evaluate(() => {
    // puppeteer need serializable values, so we omit cyclic properties
    return JSON.parse(JSON.stringify(window.wp.blocks.getBlockTypes().map(({ icon, transforms, ...rest }) => rest)))
  })
}

// parse post content to blocks array
const getParsedBlocks = async (page, postContent) => {
  await blockEditorReady(page)

  return await page.evaluate(options => window.wp.blocks.parse(options.postContent), { postContent })
}

// get blocks rendered output with inner blocks included
const getSaveContent = async (page, block) => {
  await blockEditorReady(page)

  return await page.evaluate(
    options => window.wp.blocks.getSaveContent(options.block.name, options.block.attributes, options.block.innerBlocks),
    { block }
  )
}

// const getReusableBlock = async (page, id) => {
//   await blockEditorReady(page)
//   return await page.evaluate(
//     async options => {
//       return await window.wp.apiFetch({ path: `/wp/v2/blocks/${options.id}` }).then(block => {
//         return window.wp.blocks.parse(block.content.raw).pop()
//       })
//     },
//     { id }
//   )
// }

module.exports = {
  blockEditorPage,
  blockEditorReady,
  closeEditor,
  getBlockTypes,
  getParsedBlocks,
  // getReusableBlock,
  getSaveContent,
  login,
  NotABlockEditorPageError,
}
