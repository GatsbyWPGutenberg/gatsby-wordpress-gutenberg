/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/@babel/runtime/helpers/defineProperty.js":
/*!***************************************************************!*\
  !*** ./node_modules/@babel/runtime/helpers/defineProperty.js ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

module.exports = _defineProperty;

/***/ }),

/***/ "./node_modules/@babel/runtime/helpers/objectWithoutProperties.js":
/*!************************************************************************!*\
  !*** ./node_modules/@babel/runtime/helpers/objectWithoutProperties.js ***!
  \************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var objectWithoutPropertiesLoose = __webpack_require__(/*! ./objectWithoutPropertiesLoose */ "./node_modules/@babel/runtime/helpers/objectWithoutPropertiesLoose.js");

function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = objectWithoutPropertiesLoose(source, excluded);
  var key, i;

  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }

  return target;
}

module.exports = _objectWithoutProperties;

/***/ }),

/***/ "./node_modules/@babel/runtime/helpers/objectWithoutPropertiesLoose.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/@babel/runtime/helpers/objectWithoutPropertiesLoose.js ***!
  \*****************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

module.exports = _objectWithoutPropertiesLoose;

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _preview__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./preview */ "./src/preview/index.js");


/***/ }),

/***/ "./src/preview/gatsby.js":
/*!*******************************!*\
  !*** ./src/preview/gatsby.js ***!
  \*******************************/
/*! exports provided: sendPreview */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sendPreview", function() { return sendPreview; });
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/blocks */ "@wordpress/blocks");
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! lodash */ "lodash");
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2__);

 // import { ApolloClient } from "apollo-client"
// import { HttpLink } from "apollo-link-http"
// import { ApolloLink } from "apollo-link"
// import { InMemoryCache } from "apollo-cache-inmemory"
// import gql from "graphql-tag"

 // export const createClient = ({ previewUrl }) => {
//   const url = new URL(previewUrl)
//   url.pathname += `___graphql`
//   return new ApolloClient({
//     link: ApolloLink.from([
//       new HttpLink({
//         uri: url.href,
//       }),
//     ]),
//     // disables all caching whatsoever
//     defaultOptions: {
//       query: {
//         fetchPolicy: `network-only`,
//         errorPolicy: `all`,
//       },
//     },
//     cache: new InMemoryCache(),
//   })
// }

var visitBlocks = function visitBlocks(blocks, visitor) {
  blocks.forEach(function (block) {
    visitor(block);

    if (block.innerBlocks) {
      visitBlocks(block.innerBlocks, visitor);
    }
  });
  return blocks;
};

var visitor = function visitor(block) {
  block.saveContent = Object(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__["getSaveContent"])(block.name, block.attributes, block.innerBlocks);
};

var sendPreview = Object(lodash__WEBPACK_IMPORTED_MODULE_1__["debounce"])(function (_ref) {
  var client = _ref.client,
      state = _ref.state;
  var data = JSON.parse(JSON.stringify(state));
  Object.keys(data).forEach(function (id) {
    var _data$id = data[id],
        blocks = _data$id.blocks,
        blocksByCoreBlockId = _data$id.blocksByCoreBlockId;
    visitBlocks(blocks, visitor);
    Object.keys(blocksByCoreBlockId).forEach(function (coreBlockId) {
      visitBlocks(blocksByCoreBlockId[coreBlockId], visitor);
    });
  });
  _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2___default()({
    path: "/gatsby-gutenberg/v1/previews/batch",
    method: "POST",
    data: {
      batch: data
    }
  }).then(console.log).catch(console.error); // client.query({
  //   query: gql`
  //     query SourceWordpressGutenbergPreview($data: String!) {
  //       sourceWordpressGutenbergPreview(data: $data)
  //     }
  //   `,
  //   variables: {
  //     data: JSON.stringify(data),
  //   },
  // })
}, 500);

/***/ }),

/***/ "./src/preview/index.js":
/*!******************************!*\
  !*** ./src/preview/index.js ***!
  \******************************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/data */ "@wordpress/data");
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_data__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_hooks__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/hooks */ "@wordpress/hooks");
/* harmony import */ var _wordpress_hooks__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_hooks__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _store__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./store */ "./src/preview/store.js");
/* harmony import */ var _gatsby__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./gatsby */ "./src/preview/gatsby.js");


/**
 * WordPress dependencies
 */


 // import { registerPlugin } from "@wordpress/plugins"
// import { PluginPostPublishPanel } from "@wordpress/edit-post"




if (window.wpGatsbyGutenberg) {
  var previewUrl = window.wpGatsbyGutenberg.previewUrl;

  if (previewUrl) {
    var CoreBlockContext = Object(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__["createContext"])(null); // const client = createClient({ previewUrl })

    _store__WEBPACK_IMPORTED_MODULE_3__["default"].subscribe(function () {
      Object(_gatsby__WEBPACK_IMPORTED_MODULE_4__["sendPreview"])({
        // client,
        state: _store__WEBPACK_IMPORTED_MODULE_3__["default"].getState()
      });
    });
    Object(_wordpress_hooks__WEBPACK_IMPORTED_MODULE_2__["addFilter"])("editor.BlockEdit", "plugin-wp-gatsby-gutenberg-preview/BlockEdit", function (Edit) {
      return function (props) {
        var registry = Object(_wordpress_data__WEBPACK_IMPORTED_MODULE_1__["useRegistry"])();
        var blocks = registry.select("core/block-editor").getBlocks();
        var coreBlock = Object(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__["useContext"])(CoreBlockContext);
        var id = Object(_wordpress_data__WEBPACK_IMPORTED_MODULE_1__["useSelect"])(function (select) {
          return select("core/editor").getCurrentPostId();
        });
        var slug = Object(_wordpress_data__WEBPACK_IMPORTED_MODULE_1__["useSelect"])(function (select) {
          return select("core/editor").getEditedPostAttribute("slug");
        });
        var link = Object(_wordpress_data__WEBPACK_IMPORTED_MODULE_1__["useSelect"])(function (select) {
          return select("core/editor").getEditedPostAttribute("link");
        });

        var _useDispatch = Object(_wordpress_data__WEBPACK_IMPORTED_MODULE_1__["useDispatch"])("wp-gatsby-gutenberg/preview"),
            setBlocks = _useDispatch.setBlocks;

        var coreBlockId = coreBlock && coreBlock.attributes.ref && parseInt(coreBlock.attributes.ref, 10) || null;
        Object(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__["useEffect"])(function () {
          if (id) {
            setBlocks({
              id: id,
              blocks: blocks,
              coreBlockId: coreBlockId,
              slug: slug,
              link: link
            });
          }
        }, [blocks, coreBlockId, id]);

        if (props.name === "core/block") {
          return Object(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__["createElement"])(CoreBlockContext.Provider, {
            value: props
          }, Object(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__["createElement"])(Edit, props));
        }

        return Object(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__["createElement"])(Edit, props);
      };
    });
  }
} // const GatsbyWordpressGutenbergPreview
// const GatsbyWordpressGutenbergPreview = () => {
//   useEffect(() => {})
//   return null
// }
// registerPlugin(`plugin-wp-gatsby-gutenberg-preview`, { render: GatsbyWordpressGutenbergPreview })

/***/ }),

/***/ "./src/preview/store.js":
/*!******************************!*\
  !*** ./src/preview/store.js ***!
  \******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "./node_modules/@babel/runtime/helpers/defineProperty.js");
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _babel_runtime_helpers_objectWithoutProperties__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/objectWithoutProperties */ "./node_modules/@babel/runtime/helpers/objectWithoutProperties.js");
/* harmony import */ var _babel_runtime_helpers_objectWithoutProperties__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_helpers_objectWithoutProperties__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/data */ "@wordpress/data");
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_data__WEBPACK_IMPORTED_MODULE_2__);



function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default()(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }


/* harmony default export */ __webpack_exports__["default"] = (Object(_wordpress_data__WEBPACK_IMPORTED_MODULE_2__["registerStore"])("wp-gatsby-gutenberg/preview", {
  reducer: function reducer() {
    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var action = arguments.length > 1 ? arguments[1] : undefined;

    var type = action.type,
        payload = _babel_runtime_helpers_objectWithoutProperties__WEBPACK_IMPORTED_MODULE_1___default()(action, ["type"]);

    switch (type) {
      case "SET_BLOCKS":
        {
          var blocks = payload.blocks,
              coreBlockId = payload.coreBlockId,
              id = payload.id,
              rest = _babel_runtime_helpers_objectWithoutProperties__WEBPACK_IMPORTED_MODULE_1___default()(payload, ["blocks", "coreBlockId", "id"]);

          var stateById = state[action.id] || {
            blocks: [],
            blocksByCoreBlockId: {}
          };

          if (coreBlockId) {
            return _objectSpread({}, state, _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default()({}, id, _objectSpread({}, stateById, {}, rest, {
              blocksByCoreBlockId: _objectSpread({}, stateById.blocksByCoreBlockId, _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default()({}, coreBlockId, blocks))
            })));
          }

          return _objectSpread({}, state, _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0___default()({}, id, _objectSpread({}, stateById, {}, rest, {
            blocks: blocks
          })));
        }
    }

    return state;
  },
  actions: {
    setBlocks: function setBlocks(payload) {
      return _objectSpread({}, payload, {
        type: "SET_BLOCKS"
      });
    }
  }
}));

/***/ }),

/***/ "@wordpress/api-fetch":
/*!*******************************************!*\
  !*** external {"this":["wp","apiFetch"]} ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

(function() { module.exports = this["wp"]["apiFetch"]; }());

/***/ }),

/***/ "@wordpress/blocks":
/*!*****************************************!*\
  !*** external {"this":["wp","blocks"]} ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

(function() { module.exports = this["wp"]["blocks"]; }());

/***/ }),

/***/ "@wordpress/data":
/*!***************************************!*\
  !*** external {"this":["wp","data"]} ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

(function() { module.exports = this["wp"]["data"]; }());

/***/ }),

/***/ "@wordpress/element":
/*!******************************************!*\
  !*** external {"this":["wp","element"]} ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

(function() { module.exports = this["wp"]["element"]; }());

/***/ }),

/***/ "@wordpress/hooks":
/*!****************************************!*\
  !*** external {"this":["wp","hooks"]} ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

(function() { module.exports = this["wp"]["hooks"]; }());

/***/ }),

/***/ "lodash":
/*!**********************************!*\
  !*** external {"this":"lodash"} ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports) {

(function() { module.exports = this["lodash"]; }());

/***/ })

/******/ });
//# sourceMappingURL=index.js.map