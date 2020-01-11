const login = async (browser, url, user, password) => {
  const page = await browser.newPage()

  await page.goto(url)

  await page.evaluate(
    options => {
      document.querySelector('form[name="loginform"] input[name="log"]').value = options.user
      document.querySelector('form[name="loginform"] input[name="pwd"]').value = options.password
    },
    { user, password }
  )

  const redirectTo = await page.evaluate(async () => {
    const formData = new FormData(document.querySelector('form[name="loginform"]'))
    return formData.get("redirect_to")
  })

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.evaluate(() => {
      document.querySelector('form[name="loginform"]').submit()
    }),
  ])

  const currentUrl = await page.url()

  await page.close()

  if (currentUrl !== redirectTo) {
    throw new Error("Login failed")
  }
}

class NotABlockEditorPageError extends Error {}

const blockEditorPage = async (browser, url) => {
  const isBlockEditorPage = () =>
    document.querySelector('script[src*="wp-includes"][src*="js"][src*="blocks"]') !== null

  const page = await browser.newPage(url)
  await page.goto(url, { waitUntil: "networkidle2" })

  if (!(await page.evaluate(isBlockEditorPage))) {
    await page.close()
    throw new NotABlockEditorPageError(`Url '${url}' is not a block editor page.`)
  }

  return page
}

const blockEditorReady = async page => {
  await page.evaluate(async () => {
    // taken from wp-admin/edit-form-blocks.php
    await window._wpLoadBlockEditor
  })
}

const closeEditor = async page => {
  await blockEditorReady(page)
  await page.evaluate(async () => {
    await wp.element.unmountComponentAtNode(document.querySelector("#editor"))
  })
}

const getBlockTypes = async page => {
  await blockEditorReady(page)

  return await page.evaluate(() => {
    return JSON.parse(JSON.stringify(wp.blocks.getBlockTypes().map(({ icon, transforms, ...rest }) => rest)))
  })
}

const getParsedBlocks = async (page, postContent) => {
  await blockEditorReady(page)

  return await page.evaluate(
    options => {
      return wp.blocks.parse(options.postContent)
    },
    { postContent }
  )
}

const getSaveContent = async (page, block) => {
  await blockEditorReady(page)

  return await page.evaluate(
    options => {
      return wp.blocks.getSaveContent(options.block.name, options.block.attributes, options.block.innerBlocks)
    },
    { block }
  )
}

const getReusableBlock = async (page, id) => {
  await blockEditorReady(page)
  return await page.evaluate(
    async options => {
      return await wp.apiFetch({ path: `/wp/v2/blocks/${options.id}` }).then(block => {
        return wp.blocks.parse(block.content.raw).pop()
      })
    },
    { id }
  )
}

module.exports = {
  blockEditorPage,
  blockEditorReady,
  closeEditor,
  getBlockTypes,
  getParsedBlocks,
  getReusableBlock,
  getSaveContent,
  login,
  NotABlockEditorPageError,
}
