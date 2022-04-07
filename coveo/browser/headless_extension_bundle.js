/* eslint-disable complexity */
/* eslint-disable max-statements */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports, require('@coveo/headless'))
    : typeof define === 'function' && define.amd
    ? define(['exports', '@coveo/headless'], factory)
    : ((global = typeof globalThis !== 'undefined' ? globalThis : global || self),
      factory((global.CoveoHeadlessExtension = {}), global.CoveoHeadless));
})(this, function (exports, headless) {
  'use strict';

  const randomID = (prepend, length = 5) =>
    prepend +
    Math.random()
      .toString(36)
      .substr(2, 2 + length);

  /**
   * @param {SearchEngine} engine
   * @param {string} groupName
   * @param {string} controllerType
   * @param {string} [filter]
   * @param {controllerProps} [props]
   * @return {OtherSuggestion}
   */
  function buildOtherSuggestion(engine, groupName, controllerType, filter, props) {
    let controller = undefined;
    const lastFirstSuggestion = '';
    if (controllerType === 'buildResultList') {
      controller = headless.buildResultList(engine, props);
    } else if (controllerType === 'buildFacet') {
      controller = headless.buildFacet(engine, {
        options: { ...(props === null || props === void 0 ? void 0 : props.options) }
      });
    } else if (controllerType === 'buildCategoryFacet') {
      controller = headless.buildCategoryFacet(engine, {
        options: { ...(props === null || props === void 0 ? void 0 : props.options) }
      });
    }
    return {
      engine,
      groupName,
      controller,
      controllerType,
      filter,
      lastFirstSuggestion,
      props
    };
  }
  /**
   * @param {SearchEngine} engine
   * @param {SearchBoxProps?} props
   * @param {OtherSuggestion[]} otherSuggestionsOptions
   */
  function buildCustomSearchBox(engine, props, otherSuggestionsOptions, fieldSuggestionsOptions) {
    var _a;
    const sbProps = {
      options: {
        id: ((_a = props.options) === null || _a === void 0 ? void 0 : _a.id) || randomID('custom_search_box'),
        ...props.options
      }
    };
    const options = {
      firstGroupName: 'default',
      ...props.options,
      otherSuggestions: [...otherSuggestionsOptions],
      fieldSuggestions: [...fieldSuggestionsOptions]
    };
    let prevState;
    const baseSearchBox = headless.buildSearchBox(engine, sbProps);
    const otherSuggestions = options.otherSuggestions;
    const fieldSuggestions = options.fieldSuggestions;
    const isFacetController = (x) => 'facetSearch' in x.state;
    const isResultListController = (x) => 'results' in x.state;
    otherSuggestions.forEach((otherSuggestion) => {
      const { dispatch } = otherSuggestion.engine;
      const { registerAdvancedSearchQueries } = headless.loadAdvancedSearchQueryActions(otherSuggestion.engine);
      const { registerNumberOfResults } = headless.loadPaginationActions(otherSuggestion.engine);
      if (options === null || options === void 0 ? void 0 : options.numberOfSuggestions) {
        dispatch(registerNumberOfResults(options.numberOfSuggestions));
      }
      dispatch(
        registerAdvancedSearchQueries({
          cq: (otherSuggestion === null || otherSuggestion === void 0 ? void 0 : otherSuggestion.filter) || ''
        })
      );
    });
    baseSearchBox.subscribe(() => {
      const state = baseSearchBox.state;
      otherSuggestions.forEach((otherSuggestionProp) => {
        fetchOtherSuggestions(state, otherSuggestionProp);
      });
      fieldSuggestions.forEach((fieldSuggestion) => {
        fieldSuggestion.fetchSuggestions(state.value);
      });
    });
    const getAllEngines = () => {
      let engines = [engine];
      otherSuggestions.forEach((otherSuggestion) => engines.push(otherSuggestion.engine));
      return engines;
    };
    // const getOtherSuggestions = () => {
    //   let groupedSuggestions = [];
    //   groupedSuggestions = otherSuggestions.map((otherSuggestion, idx) => {
    //     return {
    //       group: otherSuggestion.groupName,
    //       suggestions: otherSuggestion.type === 'buildResultList' ?
    //         otherSuggestion.controller.state.results:
    //         otherSuggestion.controller.state
    //     }
    //   })
    //   return groupedSuggestions;
    // }
    const getGroups = () => {
      const firstGroup = { name: options.firstGroupName, totalCount: baseSearchBox.state.suggestions.length };
      let groups = [firstGroup];
      const otherGroups = otherSuggestions.map((otherSuggestion) => ({
        name: otherSuggestion.groupName,
        totalCount: isFacetController(otherSuggestion.controller)
          ? otherSuggestion.controller.state.facetSearch.values.length
          : otherSuggestion.engine.state.search.response.totalCountFiltered
      }));
      const fieldSuggestionGroups = otherGroups.concat(
        fieldSuggestions.map((fieldSuggestion) => {
          return {
            name: fieldSuggestion.groupName,
            totalCount: fieldSuggestion.getValues().length
          };
        })
      );
      // const otherGroups = otherSuggestions.map((otherSuggestion, idx) => ({
      //   name: otherSuggestion.groupName,
      //   totalCount: otherSuggestion.controller.state?.facetSearch ?
      //     otherSuggestion.controller.state.values.length :
      //     otherSuggestion.engine.state.search.response.totalCount
      // }));
      return groups.concat(otherGroups).concat(fieldSuggestionGroups);
    };
    const getSuggestions = () => {
      let suggestions = baseSearchBox.state.suggestions.map((suggestion) => ({
        ...suggestion,
        group: options.firstGroupName,
        result: undefined
      }));
      let groupedSuggestions = [];
      otherSuggestions.forEach((otherSuggestion) => {
        if (isResultListController(otherSuggestion.controller)) {
          groupedSuggestions = groupedSuggestions.concat(
            otherSuggestion.controller.state.results.map((r) => {
              var _a, _b, _c, _d;
              const highlighted = headless.HighlightUtils.highlightString({
                content: r.title,
                highlights: r.titleHighlights,
                openingDelimiter:
                  ((_b =
                    (_a = options.highlightOptions) === null || _a === void 0 ? void 0 : _a.exactMatchDelimiters) ===
                    null || _b === void 0
                    ? void 0
                    : _b.open) || '<b>',
                closingDelimiter:
                  ((_d =
                    (_c = options.highlightOptions) === null || _c === void 0 ? void 0 : _c.exactMatchDelimiters) ===
                    null || _d === void 0
                    ? void 0
                    : _d.close) || '</b>'
              });
              return {
                rawValue: r.title,
                highlightedValue: highlighted,
                group: otherSuggestion.groupName,
                result: { ...r }
              };
            })
          );
        } else if (isFacetController(otherSuggestion.controller)) {
          groupedSuggestions = groupedSuggestions.concat(
            otherSuggestion.controller.state.facetSearch.values.map((v) => ({
              rawValue: v.rawValue,
              highlightedValue: v.displayValue,
              group: otherSuggestion.groupName,
              result: undefined
            }))
          );
          // groupedSuggestions = groupedSuggestions.concat(
          //   otherSuggestion.controller.state.values.map((v) => ({
          //     rawValue: v.value,
          //     highlightedValue: v.value,
          //     group: otherSuggestion.groupName,
          //     result: undefined
          //   })))
        }
      });
      fieldSuggestions.forEach((fieldSuggestion) => {
        groupedSuggestions = groupedSuggestions.concat(
          fieldSuggestion.getValues().map((suggestedValue) => {
            if (fieldSuggestion.categorypath_separator) {
              const splitted = suggestedValue.split(fieldSuggestion.categorypath_separator);
              const displayvalue = splitted[0];
              const path = splitted[1];
              return {
                rawValue: displayvalue,
                highlightedValue: getHighlights(displayvalue, baseSearchBox.state.value),
                group: fieldSuggestion.groupName,
                path: path
              };
            }
            return {
              rawValue: suggestedValue,
              highlightedValue: getHighlights(suggestedValue, baseSearchBox.state.value),
              group: fieldSuggestion.groupName
            };
          })
        );
      });
      return suggestions.concat(groupedSuggestions);
    };
    const hasStateChanged = (currentState) => {
      try {
        const stringifiedState = JSON.stringify(currentState);
        const hasChanged = prevState !== stringifiedState;
        prevState = stringifiedState;
        return hasChanged;
      } catch (e) {
        console.warn('Could not detect if state has changed, check the controller "get state method"', e);
        return true;
      }
    };
    function fetchOtherSuggestions(state, otherSuggestionProp) {
      const otherSuggestionsEngine = otherSuggestionProp.engine;
      const { updateQuery } = headless.loadQueryActions(otherSuggestionsEngine);
      const { executeSearch } = headless.loadSearchActions(otherSuggestionsEngine);
      const { logInterfaceLoad } = headless.loadSearchAnalyticsActions(otherSuggestionsEngine);
      let firstSuggestion;
      if (isFacetController(otherSuggestionProp.controller)) {
        otherSuggestionProp.controller.facetSearch.updateText(state.value);
        otherSuggestionProp.controller.facetSearch.search();
      } else if (
        state.suggestions.length > 0 &&
        state.suggestions[0].rawValue !== otherSuggestionProp.lastFirstSuggestion
      ) {
        firstSuggestion = state.suggestions[0].rawValue;
        otherSuggestionsEngine.dispatch(updateQuery({ q: firstSuggestion }));
        otherSuggestionsEngine.dispatch(executeSearch(logInterfaceLoad()));
        otherSuggestionProp.lastFirstSuggestion = state.suggestions[0].rawValue;
      } else if (!state.suggestions.length && state.value !== otherSuggestionProp.lastFirstSuggestion) {
        firstSuggestion = state.value;
        otherSuggestionsEngine.dispatch(updateQuery({ q: firstSuggestion }));
        otherSuggestionsEngine.dispatch(executeSearch(logInterfaceLoad()));
        otherSuggestionProp.lastFirstSuggestion = state.value;
      }
    }
    function getHighlights(value, toFind) {
      let re = new RegExp(toFind, 'gi');
      return value.replace(re, '<mark>$&</mark>');
    }
    return {
      ...baseSearchBox,
      get state() {
        // eslint-disable-next-line
        // const groupedSuggestions = getOtherSuggestions();
        const groups = getGroups();
        const newSuggestions = getSuggestions();
        return {
          ...baseSearchBox.state,
          groups,
          newSuggestions
          // groupedSuggestions
        };
      },
      subscribe(listener) {
        listener();
        prevState = JSON.stringify(this.state);
        const subscriptions = [];
        getAllEngines().forEach((e) => {
          const subscription = e.subscribe(() => {
            if (hasStateChanged(this.state)) {
              listener();
            }
          });
          subscriptions.push(subscription);
        });
        fieldSuggestions.forEach((fieldSuggestion) => {
          fieldSuggestion.subscribe(() => {});
        });
        return () => subscriptions.forEach((unsubscribe) => unsubscribe());
      }
    };
  }

  function buildCustomStandaloneSearchBox(engine, props, otherSuggestionsOptions, fieldSuggestionsOptions) {
    const { dispatch } = engine;
    const getState = () => engine.state;
    const id = props.options.id || randomID('custom_standalone_search_box');
    const options = {
      highlightOptions: { ...props.options.highlightOptions },
      ...props.options
    };
    const {
      registerStandaloneSearchBox,
      updateAnalyticsToSearchFromLink,
      // updateAnalyticsToOmniboxFromLink,
      fetchRedirectUrl
    } = headless.loadStandaloneSearchBoxSetActions(engine);
    const { selectQuerySuggestion } = headless.loadQuerySuggestActions(engine);
    const { updateQuery } = headless.loadQueryActions(engine);
    const baseCustomSearchBox = buildCustomSearchBox(engine, props, otherSuggestionsOptions, fieldSuggestionsOptions);
    dispatch(registerStandaloneSearchBox({ id, redirectionUrl: options.redirectionUrl }));
    return {
      ...baseCustomSearchBox,
      updateText(value) {
        baseCustomSearchBox.updateText(value);
        dispatch(updateAnalyticsToSearchFromLink({ id }));
      },
      selectSuggestion(value) {
        // const metadata = buildOmniboxSuggestionMetadata(getState(), {
        //   id,
        //   suggestion: value,
        // });
        dispatch(selectQuerySuggestion({ id, expression: value }));
        // dispatch(updateAnalyticsToOmniboxFromLink({id, metadata}));
        this.submit();
      },
      submit() {
        dispatch(
          updateQuery({
            q: this.state.value,
            enableQuerySyntax: options.enableQuerySyntax
          })
        );
        dispatch(fetchRedirectUrl({ id }));
      },
      get state() {
        const state = getState();
        // @ts-ignore
        const standaloneSearchBoxState = state.standaloneSearchBoxSet[id];
        return {
          ...baseCustomSearchBox.state,
          isLoading:
            standaloneSearchBoxState === null || standaloneSearchBoxState === void 0
              ? void 0
              : standaloneSearchBoxState.isLoading,
          redirectTo:
            standaloneSearchBoxState === null || standaloneSearchBoxState === void 0
              ? void 0
              : standaloneSearchBoxState.redirectTo,
          analytics:
            standaloneSearchBoxState === null || standaloneSearchBoxState === void 0
              ? void 0
              : standaloneSearchBoxState.analytics
        };
      }
    };
  }

  var commonjsGlobal =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : typeof self !== 'undefined'
      ? self
      : {};

  // Until IE support is required, exporting the global fetch is sufficient
  var fetchPonyfill = fetch;

  var backoff = {};

  var options = {};

  var __assign =
    (commonjsGlobal && commonjsGlobal.__assign) ||
    function () {
      __assign =
        Object.assign ||
        function (t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
          return t;
        };
      return __assign.apply(this, arguments);
    };
  Object.defineProperty(options, '__esModule', { value: true });
  var defaultOptions = {
    delayFirstAttempt: false,
    jitter: 'none',
    maxDelay: Infinity,
    numOfAttempts: 10,
    retry: function () {
      return true;
    },
    startingDelay: 100,
    timeMultiple: 2
  };
  function getSanitizedOptions(options) {
    var sanitized = __assign(__assign({}, defaultOptions), options);
    if (sanitized.numOfAttempts < 1) {
      sanitized.numOfAttempts = 1;
    }
    return sanitized;
  }
  options.getSanitizedOptions = getSanitizedOptions;

  var delay_factory = {};

  var skipFirst_delay = {};

  var delay_base = {};

  var jitter_factory = {};

  var full_jitter = {};

  Object.defineProperty(full_jitter, '__esModule', { value: true });
  function fullJitter(delay) {
    var jitteredDelay = Math.random() * delay;
    return Math.round(jitteredDelay);
  }
  full_jitter.fullJitter = fullJitter;

  var no_jitter = {};

  Object.defineProperty(no_jitter, '__esModule', { value: true });
  function noJitter(delay) {
    return delay;
  }
  no_jitter.noJitter = noJitter;

  Object.defineProperty(jitter_factory, '__esModule', { value: true });
  var full_jitter_1 = full_jitter;
  var no_jitter_1 = no_jitter;
  function JitterFactory(options) {
    switch (options.jitter) {
      case 'full':
        return full_jitter_1.fullJitter;
      case 'none':
      default:
        return no_jitter_1.noJitter;
    }
  }
  jitter_factory.JitterFactory = JitterFactory;

  Object.defineProperty(delay_base, '__esModule', { value: true });
  var jitter_factory_1 = jitter_factory;
  var Delay = /** @class */ (function () {
    function Delay(options) {
      this.options = options;
      this.attempt = 0;
    }
    Delay.prototype.apply = function () {
      var _this = this;
      return new Promise(function (resolve) {
        return setTimeout(resolve, _this.jitteredDelay);
      });
    };
    Delay.prototype.setAttemptNumber = function (attempt) {
      this.attempt = attempt;
    };
    Object.defineProperty(Delay.prototype, 'jitteredDelay', {
      get: function () {
        var jitter = jitter_factory_1.JitterFactory(this.options);
        return jitter(this.delay);
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(Delay.prototype, 'delay', {
      get: function () {
        var constant = this.options.startingDelay;
        var base = this.options.timeMultiple;
        var power = this.numOfDelayedAttempts;
        var delay = constant * Math.pow(base, power);
        return Math.min(delay, this.options.maxDelay);
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(Delay.prototype, 'numOfDelayedAttempts', {
      get: function () {
        return this.attempt;
      },
      enumerable: true,
      configurable: true
    });
    return Delay;
  })();
  delay_base.Delay = Delay;

  var __extends$1 =
    (commonjsGlobal && commonjsGlobal.__extends) ||
    (function () {
      var extendStatics = function (d, b) {
        extendStatics =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (d, b) {
              d.__proto__ = b;
            }) ||
          function (d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          };
        return extendStatics(d, b);
      };
      return function (d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
      };
    })();
  var __awaiter$1 =
    (commonjsGlobal && commonjsGlobal.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P
          ? value
          : new P(function (resolve) {
              resolve(value);
            });
      }
      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator['throw'](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
  var __generator$1 =
    (commonjsGlobal && commonjsGlobal.__generator) ||
    function (thisArg, body) {
      var _ = {
          label: 0,
          sent: function () {
            if (t[0] & 1) throw t[1];
            return t[1];
          },
          trys: [],
          ops: []
        },
        f,
        y,
        t,
        g;
      return (
        (g = { next: verb(0), throw: verb(1), return: verb(2) }),
        typeof Symbol === 'function' &&
          (g[Symbol.iterator] = function () {
            return this;
          }),
        g
      );
      function verb(n) {
        return function (v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError('Generator is already executing.');
        while (_)
          try {
            if (
              ((f = 1),
              y &&
                (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) &&
                !(t = t.call(y, op[1])).done)
            )
              return t;
            if (((y = 0), t)) op = [op[0] & 2, t.value];
            switch (op[0]) {
              case 0:
              case 1:
                t = op;
                break;
              case 4:
                _.label++;
                return { value: op[1], done: false };
              case 5:
                _.label++;
                y = op[1];
                op = [0];
                continue;
              case 7:
                op = _.ops.pop();
                _.trys.pop();
                continue;
              default:
                if (!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) && (op[0] === 6 || op[0] === 2)) {
                  _ = 0;
                  continue;
                }
                if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                  _.label = op[1];
                  break;
                }
                if (op[0] === 6 && _.label < t[1]) {
                  _.label = t[1];
                  t = op;
                  break;
                }
                if (t && _.label < t[2]) {
                  _.label = t[2];
                  _.ops.push(op);
                  break;
                }
                if (t[2]) _.ops.pop();
                _.trys.pop();
                continue;
            }
            op = body.call(thisArg, _);
          } catch (e) {
            op = [6, e];
            y = 0;
          } finally {
            f = t = 0;
          }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
  Object.defineProperty(skipFirst_delay, '__esModule', { value: true });
  var delay_base_1$1 = delay_base;
  var SkipFirstDelay = /** @class */ (function (_super) {
    __extends$1(SkipFirstDelay, _super);
    function SkipFirstDelay() {
      return (_super !== null && _super.apply(this, arguments)) || this;
    }
    SkipFirstDelay.prototype.apply = function () {
      return __awaiter$1(this, void 0, void 0, function () {
        return __generator$1(this, function (_a) {
          return [2 /*return*/, this.isFirstAttempt ? true : _super.prototype.apply.call(this)];
        });
      });
    };
    Object.defineProperty(SkipFirstDelay.prototype, 'isFirstAttempt', {
      get: function () {
        return this.attempt === 0;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(SkipFirstDelay.prototype, 'numOfDelayedAttempts', {
      get: function () {
        return this.attempt - 1;
      },
      enumerable: true,
      configurable: true
    });
    return SkipFirstDelay;
  })(delay_base_1$1.Delay);
  skipFirst_delay.SkipFirstDelay = SkipFirstDelay;

  var always_delay = {};

  var __extends =
    (commonjsGlobal && commonjsGlobal.__extends) ||
    (function () {
      var extendStatics = function (d, b) {
        extendStatics =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (d, b) {
              d.__proto__ = b;
            }) ||
          function (d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          };
        return extendStatics(d, b);
      };
      return function (d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
      };
    })();
  Object.defineProperty(always_delay, '__esModule', { value: true });
  var delay_base_1 = delay_base;
  var AlwaysDelay = /** @class */ (function (_super) {
    __extends(AlwaysDelay, _super);
    function AlwaysDelay() {
      return (_super !== null && _super.apply(this, arguments)) || this;
    }
    return AlwaysDelay;
  })(delay_base_1.Delay);
  always_delay.AlwaysDelay = AlwaysDelay;

  Object.defineProperty(delay_factory, '__esModule', { value: true });
  var skip_first_delay_1 = skipFirst_delay;
  var always_delay_1 = always_delay;
  function DelayFactory(options, attempt) {
    var delay = initDelayClass(options);
    delay.setAttemptNumber(attempt);
    return delay;
  }
  delay_factory.DelayFactory = DelayFactory;
  function initDelayClass(options) {
    if (!options.delayFirstAttempt) {
      return new skip_first_delay_1.SkipFirstDelay(options);
    }
    return new always_delay_1.AlwaysDelay(options);
  }

  var __awaiter =
    (commonjsGlobal && commonjsGlobal.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P
          ? value
          : new P(function (resolve) {
              resolve(value);
            });
      }
      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator['throw'](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
  var __generator =
    (commonjsGlobal && commonjsGlobal.__generator) ||
    function (thisArg, body) {
      var _ = {
          label: 0,
          sent: function () {
            if (t[0] & 1) throw t[1];
            return t[1];
          },
          trys: [],
          ops: []
        },
        f,
        y,
        t,
        g;
      return (
        (g = { next: verb(0), throw: verb(1), return: verb(2) }),
        typeof Symbol === 'function' &&
          (g[Symbol.iterator] = function () {
            return this;
          }),
        g
      );
      function verb(n) {
        return function (v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError('Generator is already executing.');
        while (_)
          try {
            if (
              ((f = 1),
              y &&
                (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) &&
                !(t = t.call(y, op[1])).done)
            )
              return t;
            if (((y = 0), t)) op = [op[0] & 2, t.value];
            switch (op[0]) {
              case 0:
              case 1:
                t = op;
                break;
              case 4:
                _.label++;
                return { value: op[1], done: false };
              case 5:
                _.label++;
                y = op[1];
                op = [0];
                continue;
              case 7:
                op = _.ops.pop();
                _.trys.pop();
                continue;
              default:
                if (!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) && (op[0] === 6 || op[0] === 2)) {
                  _ = 0;
                  continue;
                }
                if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                  _.label = op[1];
                  break;
                }
                if (op[0] === 6 && _.label < t[1]) {
                  _.label = t[1];
                  t = op;
                  break;
                }
                if (t && _.label < t[2]) {
                  _.label = t[2];
                  _.ops.push(op);
                  break;
                }
                if (t[2]) _.ops.pop();
                _.trys.pop();
                continue;
            }
            op = body.call(thisArg, _);
          } catch (e) {
            op = [6, e];
            y = 0;
          } finally {
            f = t = 0;
          }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
  Object.defineProperty(backoff, '__esModule', { value: true });
  var options_1 = options;
  var delay_factory_1 = delay_factory;
  function backOff(request, options) {
    if (options === void 0) {
      options = {};
    }
    return __awaiter(this, void 0, void 0, function () {
      var sanitizedOptions, backOff;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            sanitizedOptions = options_1.getSanitizedOptions(options);
            backOff = new BackOff(request, sanitizedOptions);
            return [4 /*yield*/, backOff.execute()];
          case 1:
            return [2 /*return*/, _a.sent()];
        }
      });
    });
  }
  var backOff_1 = (backoff.backOff = backOff);
  var BackOff = /** @class */ (function () {
    function BackOff(request, options) {
      this.request = request;
      this.options = options;
      this.attemptNumber = 0;
    }
    BackOff.prototype.execute = function () {
      return __awaiter(this, void 0, void 0, function () {
        var e_1, shouldRetry;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              if (!!this.attemptLimitReached) return [3 /*break*/, 7];
              _a.label = 1;
            case 1:
              _a.trys.push([1, 4, , 6]);
              return [4 /*yield*/, this.applyDelay()];
            case 2:
              _a.sent();
              return [4 /*yield*/, this.request()];
            case 3:
              return [2 /*return*/, _a.sent()];
            case 4:
              e_1 = _a.sent();
              this.attemptNumber++;
              return [4 /*yield*/, this.options.retry(e_1, this.attemptNumber)];
            case 5:
              shouldRetry = _a.sent();
              if (!shouldRetry || this.attemptLimitReached) {
                throw e_1;
              }
              return [3 /*break*/, 6];
            case 6:
              return [3 /*break*/, 0];
            case 7:
              throw new Error('Something went wrong.');
          }
        });
      });
    };
    Object.defineProperty(BackOff.prototype, 'attemptLimitReached', {
      get: function () {
        return this.attemptNumber >= this.options.numOfAttempts;
      },
      enumerable: true,
      configurable: true
    });
    BackOff.prototype.applyDelay = function () {
      return __awaiter(this, void 0, void 0, function () {
        var delay;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              delay = delay_factory_1.DelayFactory(this.options, this.attemptNumber);
              return [4 /*yield*/, delay.apply()];
            case 1:
              _a.sent();
              return [2 /*return*/];
          }
        });
      });
    };
    return BackOff;
  })();

  class ExpiredTokenError extends Error {
    constructor() {
      super();
      this.name = 'ExpiredToken';
      this.message = 'The token being used to perform the request is expired.';
    }
  }
  class DisconnectedError extends Error {
    constructor(url, statusCode) {
      super();
      this.name = 'Disconnected';
      this.message = `Client could not connect to the following URL: ${url}`;
      this.statusCode = statusCode !== null && statusCode !== void 0 ? statusCode : 0;
    }
  }

  function isThrottled(status) {
    return status === 429;
  }
  class PlatformClient {
    static async call(options) {
      const defaultRequestOptions = buildDefaultRequestOptions(options);
      const { logger } = options;
      const requestInfo = {
        ...defaultRequestOptions
      };
      const { url, ...requestData } = requestInfo;
      const request = async () => {
        const response = await fetchPonyfill(url, requestData);
        if (isThrottled(response.status)) {
          throw response;
        }
        return response;
      };
      try {
        const response = await backOff_1(request, {
          retry: (e) => {
            const shouldRetry = e && isThrottled(e.status);
            shouldRetry && logger.info('Platform retrying request');
            return shouldRetry;
          }
        });
        if (response.status === 419) {
          logger.info('Platform renewing token');
          throw new ExpiredTokenError();
        }
        if (response.status === 404) {
          throw new DisconnectedError(url, response.status);
        }
        logger.info({ response, requestInfo }, 'Platform response');
        return response;
      } catch (error) {
        if (error.message === 'Failed to fetch') {
          return new DisconnectedError(url);
        }
        return error;
      }
    }
  }
  function buildDefaultRequestOptions(options) {
    const { url, method, requestParams, contentType, accessToken, signal } = options;
    const body = encodeBody(requestParams, contentType);
    return {
      url,
      method,
      headers: {
        'Content-Type': contentType,
        Authorization: `Bearer ${accessToken}`,
        ...options.headers
      },
      body,
      signal
    };
  }
  function encodeAsFormUrl(obj) {
    const body = [];
    for (const property in obj) {
      const key = encodeURIComponent(property);
      const value = encodeURIComponent(obj[property]);
      body.push(`${key}=${value}`);
    }
    return body.join('&');
  }
  function canBeFormUrlEncoded(obj) {
    if (typeof obj !== 'object') {
      return false;
    }
    if (!obj) {
      return false;
    }
    return Object.values(obj).every(isPrimitive);
  }
  function isPrimitive(val) {
    return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
  }
  function encodeBody(body, contentType) {
    if (contentType === 'application/x-www-form-urlencoded') {
      return canBeFormUrlEncoded(body) ? encodeAsFormUrl(body) : '';
    }
    return JSON.stringify(body);
  }

  const baseSearchRequest = (req, method, contentType, path) => ({
    accessToken: req.accessToken,
    method,
    contentType,
    url: `${req.url}${path}?${getOrganizationIdQueryParam(req)}`
  });
  const getOrganizationIdQueryParam = (req) => `organizationId=${req.organizationId}`;

  function buildDisconnectedError(error) {
    return {
      statusCode: error.statusCode,
      type: error.name,
      message: error.message
    };
  }
  function buildAPIResponseFromErrorOrThrow(error) {
    if (error instanceof DisconnectedError) {
      return { error: buildDisconnectedError(error) };
    }
    throw error;
  }

  class SearchAPIClient {
    constructor(options) {
      this.options = options;
    }
    async values(req) {
      let prms = {
        ...baseSearchRequest(req, 'POST', 'application/json', '/values'),
        requestParams: pickNonBaseParams(req),
        ...this.options
      };
      const response = await PlatformClient.call(prms);
      if (response instanceof Error) {
        throw response;
      }
      const body = await response.json();
      // const payload = {response, body};
      return body;
    }
    async plan(req) {
      const response = await PlatformClient.call({
        ...baseSearchRequest(req, 'POST', 'application/json', '/plan'),
        requestParams: pickNonBaseParams(req),
        ...this.options
      });
      if (response instanceof Error) {
        return buildAPIResponseFromErrorOrThrow(response);
      }
      const body = await response.json();
      if (isSuccessPlanResponse(body)) {
        return { success: body };
      }
      return {
        error: { response, body }
      };
    }
  }
  function isSuccessPlanResponse(body) {
    return body.preprocessingOutput !== undefined;
  }
  function pickNonBaseParams(req) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { url, accessToken, organizationId, ...nonBase } = req;
    return nonBase;
  }

  function tryStringify(o) {
    try {
      return JSON.stringify(o);
    } catch (e) {
      return '"[Circular]"';
    }
  }

  var quickFormatUnescaped = format$1;

  function format$1(f, args, opts) {
    var ss = (opts && opts.stringify) || tryStringify;
    var offset = 1;
    if (typeof f === 'object' && f !== null) {
      var len = args.length + offset;
      if (len === 1) return f;
      var objects = new Array(len);
      objects[0] = ss(f);
      for (var index = 1; index < len; index++) {
        objects[index] = ss(args[index]);
      }
      return objects.join(' ');
    }
    if (typeof f !== 'string') {
      return f;
    }
    var argLen = args.length;
    if (argLen === 0) return f;
    var str = '';
    var a = 1 - offset;
    var lastPos = -1;
    var flen = (f && f.length) || 0;
    for (var i = 0; i < flen; ) {
      if (f.charCodeAt(i) === 37 && i + 1 < flen) {
        lastPos = lastPos > -1 ? lastPos : 0;
        switch (f.charCodeAt(i + 1)) {
          case 100: // 'd'
          case 102: // 'f'
            if (a >= argLen) break;
            if (args[a] == null) break;
            if (lastPos < i) str += f.slice(lastPos, i);
            str += Number(args[a]);
            lastPos = i + 2;
            i++;
            break;
          case 105: // 'i'
            if (a >= argLen) break;
            if (args[a] == null) break;
            if (lastPos < i) str += f.slice(lastPos, i);
            str += Math.floor(Number(args[a]));
            lastPos = i + 2;
            i++;
            break;
          case 79: // 'O'
          case 111: // 'o'
          case 106: // 'j'
            if (a >= argLen) break;
            if (args[a] === undefined) break;
            if (lastPos < i) str += f.slice(lastPos, i);
            var type = typeof args[a];
            if (type === 'string') {
              str += "'" + args[a] + "'";
              lastPos = i + 2;
              i++;
              break;
            }
            if (type === 'function') {
              str += args[a].name || '<anonymous>';
              lastPos = i + 2;
              i++;
              break;
            }
            str += ss(args[a]);
            lastPos = i + 2;
            i++;
            break;
          case 115: // 's'
            if (a >= argLen) break;
            if (lastPos < i) str += f.slice(lastPos, i);
            str += String(args[a]);
            lastPos = i + 2;
            i++;
            break;
          case 37: // '%'
            if (lastPos < i) str += f.slice(lastPos, i);
            str += '%';
            lastPos = i + 2;
            i++;
            a--;
            break;
        }
        ++a;
      }
      ++i;
    }
    if (lastPos === -1) return f;
    else if (lastPos < flen) {
      str += f.slice(lastPos);
    }

    return str;
  }

  const format = quickFormatUnescaped;

  var browser = pino;

  const _console = pfGlobalThisOrFallback().console || {};
  const stdSerializers = {
    mapHttpRequest: mock,
    mapHttpResponse: mock,
    wrapRequestSerializer: passthrough,
    wrapResponseSerializer: passthrough,
    wrapErrorSerializer: passthrough,
    req: mock,
    res: mock,
    err: asErrValue
  };

  function shouldSerialize(serialize, serializers) {
    if (Array.isArray(serialize)) {
      const hasToFilter = serialize.filter(function (k) {
        return k !== '!stdSerializers.err';
      });
      return hasToFilter;
    } else if (serialize === true) {
      return Object.keys(serializers);
    }

    return false;
  }

  function pino(opts) {
    opts = opts || {};
    opts.browser = opts.browser || {};

    const transmit = opts.browser.transmit;
    if (transmit && typeof transmit.send !== 'function') {
      throw Error('pino: transmit option must have a send function');
    }

    const proto = opts.browser.write || _console;
    if (opts.browser.write) opts.browser.asObject = true;
    const serializers = opts.serializers || {};
    const serialize = shouldSerialize(opts.browser.serialize, serializers);
    let stdErrSerialize = opts.browser.serialize;

    if (Array.isArray(opts.browser.serialize) && opts.browser.serialize.indexOf('!stdSerializers.err') > -1)
      stdErrSerialize = false;

    const levels = ['error', 'fatal', 'warn', 'info', 'debug', 'trace'];

    if (typeof proto === 'function') {
      proto.error = proto.fatal = proto.warn = proto.info = proto.debug = proto.trace = proto;
    }
    if (opts.enabled === false) opts.level = 'silent';
    const level = opts.level || 'info';
    const logger = Object.create(proto);
    if (!logger.log) logger.log = noop;

    Object.defineProperty(logger, 'levelVal', {
      get: getLevelVal
    });
    Object.defineProperty(logger, 'level', {
      get: getLevel,
      set: setLevel
    });

    const setOpts = {
      transmit,
      serialize,
      asObject: opts.browser.asObject,
      levels,
      timestamp: getTimeFunction(opts)
    };
    logger.levels = pino.levels;
    logger.level = level;

    logger.setMaxListeners = logger.getMaxListeners = logger.emit = logger.addListener = logger.on = logger.prependListener = logger.once = logger.prependOnceListener = logger.removeListener = logger.removeAllListeners = logger.listeners = logger.listenerCount = logger.eventNames = logger.write = logger.flush = noop;
    logger.serializers = serializers;
    logger._serialize = serialize;
    logger._stdErrSerialize = stdErrSerialize;
    logger.child = child;

    if (transmit) logger._logEvent = createLogEventShape();

    function getLevelVal() {
      return this.level === 'silent' ? Infinity : this.levels.values[this.level];
    }

    function getLevel() {
      return this._level;
    }
    function setLevel(level) {
      if (level !== 'silent' && !this.levels.values[level]) {
        throw Error('unknown level ' + level);
      }
      this._level = level;

      set(setOpts, logger, 'error', 'log'); // <-- must stay first
      set(setOpts, logger, 'fatal', 'error');
      set(setOpts, logger, 'warn', 'error');
      set(setOpts, logger, 'info', 'log');
      set(setOpts, logger, 'debug', 'log');
      set(setOpts, logger, 'trace', 'log');
    }

    function child(bindings, childOptions) {
      if (!bindings) {
        throw new Error('missing bindings for child Pino');
      }
      childOptions = childOptions || {};
      if (serialize && bindings.serializers) {
        childOptions.serializers = bindings.serializers;
      }
      const childOptionsSerializers = childOptions.serializers;
      if (serialize && childOptionsSerializers) {
        var childSerializers = Object.assign({}, serializers, childOptionsSerializers);
        var childSerialize = opts.browser.serialize === true ? Object.keys(childSerializers) : serialize;
        delete bindings.serializers;
        applySerializers([bindings], childSerialize, childSerializers, this._stdErrSerialize);
      }
      function Child(parent) {
        this._childLevel = (parent._childLevel | 0) + 1;
        this.error = bind(parent, bindings, 'error');
        this.fatal = bind(parent, bindings, 'fatal');
        this.warn = bind(parent, bindings, 'warn');
        this.info = bind(parent, bindings, 'info');
        this.debug = bind(parent, bindings, 'debug');
        this.trace = bind(parent, bindings, 'trace');
        if (childSerializers) {
          this.serializers = childSerializers;
          this._serialize = childSerialize;
        }
        if (transmit) {
          this._logEvent = createLogEventShape([].concat(parent._logEvent.bindings, bindings));
        }
      }
      Child.prototype = this;
      return new Child(this);
    }
    return logger;
  }

  pino.levels = {
    values: {
      fatal: 60,
      error: 50,
      warn: 40,
      info: 30,
      debug: 20,
      trace: 10
    },
    labels: {
      10: 'trace',
      20: 'debug',
      30: 'info',
      40: 'warn',
      50: 'error',
      60: 'fatal'
    }
  };

  pino.stdSerializers = stdSerializers;
  pino.stdTimeFunctions = Object.assign({}, { nullTime, epochTime, unixTime, isoTime });

  function set(opts, logger, level, fallback) {
    const proto = Object.getPrototypeOf(logger);
    logger[level] =
      logger.levelVal > logger.levels.values[level]
        ? noop
        : proto[level]
        ? proto[level]
        : _console[level] || _console[fallback] || noop;

    wrap(opts, logger, level);
  }

  function wrap(opts, logger, level) {
    if (!opts.transmit && logger[level] === noop) return;

    logger[level] = (function (write) {
      return function LOG() {
        const ts = opts.timestamp();
        const args = new Array(arguments.length);
        const proto = Object.getPrototypeOf && Object.getPrototypeOf(this) === _console ? _console : this;
        for (var i = 0; i < args.length; i++) args[i] = arguments[i];

        if (opts.serialize && !opts.asObject) {
          applySerializers(args, this._serialize, this.serializers, this._stdErrSerialize);
        }
        if (opts.asObject) write.call(proto, asObject(this, level, args, ts));
        else write.apply(proto, args);

        if (opts.transmit) {
          const transmitLevel = opts.transmit.level || logger.level;
          const transmitValue = pino.levels.values[transmitLevel];
          const methodValue = pino.levels.values[level];
          if (methodValue < transmitValue) return;
          transmit(
            this,
            {
              ts,
              methodLevel: level,
              methodValue,
              transmitLevel,
              transmitValue: pino.levels.values[opts.transmit.level || logger.level],
              send: opts.transmit.send,
              val: logger.levelVal
            },
            args
          );
        }
      };
    })(logger[level]);
  }

  function asObject(logger, level, args, ts) {
    if (logger._serialize) applySerializers(args, logger._serialize, logger.serializers, logger._stdErrSerialize);
    const argsCloned = args.slice();
    let msg = argsCloned[0];
    const o = {};
    if (ts) {
      o.time = ts;
    }
    o.level = pino.levels.values[level];
    let lvl = (logger._childLevel | 0) + 1;
    if (lvl < 1) lvl = 1;
    // deliberate, catching objects, arrays
    if (msg !== null && typeof msg === 'object') {
      while (lvl-- && typeof argsCloned[0] === 'object') {
        Object.assign(o, argsCloned.shift());
      }
      msg = argsCloned.length ? format(argsCloned.shift(), argsCloned) : undefined;
    } else if (typeof msg === 'string') msg = format(argsCloned.shift(), argsCloned);
    if (msg !== undefined) o.msg = msg;
    return o;
  }

  function applySerializers(args, serialize, serializers, stdErrSerialize) {
    for (const i in args) {
      if (stdErrSerialize && args[i] instanceof Error) {
        args[i] = pino.stdSerializers.err(args[i]);
      } else if (typeof args[i] === 'object' && !Array.isArray(args[i])) {
        for (const k in args[i]) {
          if (serialize && serialize.indexOf(k) > -1 && k in serializers) {
            args[i][k] = serializers[k](args[i][k]);
          }
        }
      }
    }
  }

  function bind(parent, bindings, level) {
    return function () {
      const args = new Array(1 + arguments.length);
      args[0] = bindings;
      for (var i = 1; i < args.length; i++) {
        args[i] = arguments[i - 1];
      }
      return parent[level].apply(this, args);
    };
  }

  function transmit(logger, opts, args) {
    const send = opts.send;
    const ts = opts.ts;
    const methodLevel = opts.methodLevel;
    const methodValue = opts.methodValue;
    const val = opts.val;
    const bindings = logger._logEvent.bindings;

    applySerializers(
      args,
      logger._serialize || Object.keys(logger.serializers),
      logger.serializers,
      logger._stdErrSerialize === undefined ? true : logger._stdErrSerialize
    );
    logger._logEvent.ts = ts;
    logger._logEvent.messages = args.filter(function (arg) {
      // bindings can only be objects, so reference equality check via indexOf is fine
      return bindings.indexOf(arg) === -1;
    });

    logger._logEvent.level.label = methodLevel;
    logger._logEvent.level.value = methodValue;

    send(methodLevel, logger._logEvent, val);

    logger._logEvent = createLogEventShape(bindings);
  }

  function createLogEventShape(bindings) {
    return {
      ts: 0,
      messages: [],
      bindings: bindings || [],
      level: { label: '', value: 0 }
    };
  }

  function asErrValue(err) {
    const obj = {
      type: err.constructor.name,
      msg: err.message,
      stack: err.stack
    };
    for (const key in err) {
      if (obj[key] === undefined) {
        obj[key] = err[key];
      }
    }
    return obj;
  }

  function getTimeFunction(opts) {
    if (typeof opts.timestamp === 'function') {
      return opts.timestamp;
    }
    if (opts.timestamp === false) {
      return nullTime;
    }
    return epochTime;
  }

  function mock() {
    return {};
  }
  function passthrough(a) {
    return a;
  }
  function noop() {}

  function nullTime() {
    return false;
  }
  function epochTime() {
    return Date.now();
  }
  function unixTime() {
    return Math.round(Date.now() / 1000.0);
  }
  function isoTime() {
    return new Date(Date.now()).toISOString();
  } // using Date.now() for testability

  /* eslint-disable */
  /* istanbul ignore next */
  function pfGlobalThisOrFallback() {
    function defd(o) {
      return typeof o !== 'undefined' && o;
    }
    try {
      if (typeof globalThis !== 'undefined') return globalThis;
      Object.defineProperty(Object.prototype, 'globalThis', {
        get: function () {
          delete Object.prototype.globalThis;
          return (this.globalThis = this);
        },
        configurable: true
      });
      return globalThis;
    } catch (e) {
      return defd(self) || defd(window) || defd(this) || {};
    }
  }

  function buildLogger(options) {
    return browser({
      name: '@sbr/headless-extension',
      level: (options === null || options === void 0 ? void 0 : options.level) || 'warn',
      formatters: {
        log: options === null || options === void 0 ? void 0 : options.logFormatter
      },
      browser: {
        transmit: {
          send: (options === null || options === void 0 ? void 0 : options.browserPostLogHook) || (() => {})
        }
      }
    });
  }

  function isRedirectTrigger(trigger) {
    return trigger.type === 'redirect';
  }

  /**
   * The plan of execution of a search request.
   */
  class ExecutionPlan {
    constructor(response) {
      this.response = response;
    }
    /**
     * Gets the final value of the basic expression (`q`) after the search request has been processed in the query pipeline, but before it is sent to the index.
     */
    get basicExpression() {
      return this.response.parsedInput.basicExpression;
    }
    /**
     * Gets the final value of the large expression (`lq`) after the search request has been processed in the query pipeline, but before it is sent to the index.
     */
    get largeExpression() {
      return this.response.parsedInput.largeExpression;
    }
    /**
     * Gets the final value of the advanced expression (`aq`) after the search request has been processed in the query pipeline, but before it is sent to the index.
     */
    get advancedExpression() {
      return this.response.parsedInput.advancedExpression;
    }
    /**
     * Gets the final value of the constant expression (`cq`) after the search request has been processed in the query pipeline, but before it is sent to the index.
     */
    get constantExpression() {
      return this.response.parsedInput.constantExpression;
    }
    /**
     * Gets the URL to redirect the browser to, if the search request satisfies the condition of a `redirect` trigger rule in the query pipeline.
     *
     * Returns `null` otherwise.
     */
    get redirectionUrl() {
      const redirects = this.response.preprocessingOutput.triggers.filter(isRedirectTrigger);
      return redirects.length ? redirects[0].content : null;
    }
  }

  class TreeNode {
    constructor(name, raw) {
      this.name = name;
      this.raw = raw;
      this.name = name;
      this.raw = raw;
      this.children = [];
    }
    add(child) {
      this.children.push(child);
    }
    remove(child) {
      var length = this.children.length;
      for (var i = 0; i < length; i++) {
        if (this.children[i] === child) {
          this.children.splice(i, 1);
          return;
        }
      }
    }
    getChild(i) {
      return this.children[i];
    }
    hasChildren() {
      return this.children.length > 0;
    }
  }

  function buildCustomCategoryNavMenu(engine, props) {
    const logger = buildLogger({});
    let fieldValues = [];
    let constantExpression;
    const searchAPIClient = new SearchAPIClient({ logger });
    const options = {
      delimitingCharacter: '|',
      ignoreQuery: true,
      ...props.options
    };
    const fetchFieldValues = async () => {
      // const searchResponsePromise = new Promise<any>((resolve)=>{
      //   const internal_engine = buildSearchEngine({
      //     configuration: {
      //       ...engine.state.configuration,
      //       search: {
      //         preprocessSearchResponseMiddleware: (searchResponse) => {
      //           const body:any = searchResponse.body;
      //           resolve(body);
      //           return searchResponse;
      //         }
      //       }
      //     }
      //   })
      var _a, _b;
      //   const {disableAnalytics, dispatch, executeFirstSearch} = internal_engine;
      //   const {setContext} = loadContextActions(internal_engine);
      //   const {enableDebug} = loadDebugActions(internal_engine)
      //   if(engine.state.context?.contextValues){
      //     dispatch(setContext(engine.state.context?.contextValues));
      //   }
      //   dispatch(enableDebug());
      //   disableAnalytics();
      //   executeFirstSearch();
      // });
      const planResponse = await searchAPIClient.plan(buildPlanRequest(engine.state));
      // const searchResponse = await searchResponsePromise;
      // constantExpression = getConstantExpression(searchResponse);
      constantExpression = getConstantExpression(planResponse);
      const neededfieldValuesState = {
        ...engine.state,
        ...options,
        constantQueryOverride: constantExpression,
        queryOverride: !options.ignoreQuery
          ? (_b = (_a = engine.state) === null || _a === void 0 ? void 0 : _a.query) === null || _b === void 0
            ? void 0
            : _b.q
          : ''
      };
      const response = await searchAPIClient.values(buildValuesRequest(neededfieldValuesState));
      fieldValues = response === null || response === void 0 ? void 0 : response.values;
      return {
        ...response
      };
    };
    // const getConstantExpression = (searchResponse:any) => {
    //   let expression = `${searchResponse?.advancedExpression} ${searchResponse?.constantExpression}`;
    //   // remove potential filter from current field
    //   const regEx = new RegExp(`@${options.field}==\([^()]+\)`, 'gmi')
    //   expression = expression.replace(regEx, '')
    //   return expression;
    // }
    const getConstantExpression = (response) => {
      let finalExpression = '';
      if (response.success) {
        const { constantExpression, advancedExpression } = new ExecutionPlan(response.success);
        finalExpression = `${advancedExpression} ${constantExpression}`;
        // remove potential filter from current field
        const regEx = new RegExp(`@${options.field}==\([^()]+\)`, 'gmi');
        finalExpression = finalExpression.replace(regEx, '');
      }
      return finalExpression;
    };
    const getNavMenu = (rawValues) => {
      var _a;
      let navMenuValues = [];
      const joinedBasePath =
        (_a = options.basePath) === null || _a === void 0 ? void 0 : _a.join(options.delimitingCharacter);
      const filteredRawValues = joinedBasePath
        ? rawValues.filter((v) => v.value.indexOf(joinedBasePath) >= 0)
        : rawValues;
      filteredRawValues.forEach((v) => {
        const { numberOfResults, value } = v;
        const levels = value.replace(joinedBasePath, '').split(options.delimitingCharacter);
        const filteredLevels = levels.filter((l) => l !== '');
        if (filteredLevels.length) {
          const firstLevel = filteredLevels[0];
          const found = navMenuValues.find((navMenu) => navMenu.value.indexOf(firstLevel) >= 0);
          if (found) {
            found.subLevels = found.subLevels.concat(filteredLevels.slice(1));
          } else {
            navMenuValues.push({
              value: firstLevel,
              subLevels: [],
              numberOfResults
            });
          }
        }
      });
      return navMenuValues;
    };
    const getHierarchicalValues = (rawValues) => {
      var _a;
      const joinedBasePath =
        (_a = options.basePath) === null || _a === void 0 ? void 0 : _a.join(options.delimitingCharacter);
      const filteredRawValues = joinedBasePath
        ? rawValues.filter((v) => v.value.indexOf(joinedBasePath) >= 0)
        : rawValues;
      const tree = new TreeNode('root', null);
      let previousLevel = tree;
      filteredRawValues.forEach((v) => {
        const { value } = v;
        const levels = value
          .replace(joinedBasePath, '')
          .split(options.delimitingCharacter)
          .filter((l) => l !== '');
        levels.forEach((level, idx) => {
          let currentLevel = previousLevel.children.find((t) => t.name === level);
          if (!currentLevel) {
            currentLevel = new TreeNode(level, { ...v, state: 'idle' });
            previousLevel.add(currentLevel);
          }
          previousLevel = levels.length - 1 === idx ? tree : currentLevel;
        });
      });
      return tree.children;
    };
    // const buildTreeFromFacetValue = (facetValue:any) => {
    //   let treeValue = {}
    //   const {numberOfResults, value} = facetValue;
    //   const joinedBasePath = options.basePath?.join(options.delimitingCharacter);
    //   const levels: any[] = value.replace(joinedBasePath, '').split(options.delimitingCharacter).filter((l:string) => l !== '');
    //   if(levels.length === 1){
    //     treeValue = {
    //       value: getParent(facetValue.value),
    //       childs: [],
    //       numberOfResults
    //     }
    //   }
    //   levels.forEach((l:string, idx)=>{
    //     if(idx > 0) {
    //       treeValue.childs.push
    //     } else {
    //       treeValue = {
    //         value: l,
    //         childs: [],
    //         numberOfResults
    //       };
    //     }
    //     const parent = getParent(l)
    //     if(parent){
    //     }
    //     const found = hierarchichalValues.find(hv => hv.value.indexOf(l) >= 0);
    //     if(found){
    //       //found.childs = found.childs.concat(levels.slice(1));
    //       found.childs.push({
    //         parent,
    //         value: l,
    //         childs: [],
    //         numberOfResults
    //       });
    //     } else {
    //       hierarchichalValues.push({
    //         parent,
    //         value: l,
    //         childs: [],
    //         numberOfResults
    //       });
    //     }
    //   })
    // }
    // const getParent = (value: any) => {
    //   let lastIndexOfDelimiting = value.lastIndexOf(options.delimitingCharacter);
    //   if (lastIndexOfDelimiting != -1) {
    //     return value.substring(0, lastIndexOfDelimiting).split(options.delimitingCharacter).slice(-1);
    //   }
    //   return undefined;
    // }
    return {
      subscribe(listener) {
        fetchFieldValues().then(listener);
        const { context } = engine.state;
        // const constantExpression = this.constantExpression;
        let prevState = JSON.stringify(options.ignoreQuery ? { context } : engine.state);
        const unsubscribe = engine.subscribe(() => {
          const { context } = engine.state;
          // const constantExpression = this.constantExpression;
          const currentState = JSON.stringify(options.ignoreQuery ? { context } : engine.state);
          if (prevState !== currentState) {
            prevState = currentState;
            fetchFieldValues().then(listener);
          }
        });
        return unsubscribe;
      },
      get state() {
        return {
          rawValues: fieldValues,
          navMenu: getNavMenu(fieldValues),
          hierarchicalValues: getHierarchicalValues(fieldValues)
        };
      },
      get constantExpression() {
        return constantExpression;
      },
      fetchFieldValues
    };
  }
  const buildValuesRequest = (state) => {
    return {
      url: state.configuration.search.apiBaseUrl,
      accessToken: state.configuration.accessToken,
      organizationId: state.configuration.organizationId,
      field: state.field,
      maximumNumberOfValues: 1000,
      constantQueryOverride: state.constantQueryOverride,
      queryOverride: state.queryOverride,
      ...(state.context && { context: state.context.contextValues })
    };
  };
  const buildPlanRequest = (state) => {
    var _a;
    return {
      accessToken: state.configuration.accessToken,
      organizationId: state.configuration.organizationId,
      url: state.configuration.search.apiBaseUrl,
      locale: state.configuration.search.locale,
      timezone: state.configuration.search.timezone,
      q: (_a = state === null || state === void 0 ? void 0 : state.query) === null || _a === void 0 ? void 0 : _a.q,
      ...(state.categoryFacetSet && {
        categoryFacets: [...Object.keys(state.categoryFacetSet).map((cf) => state.categoryFacetSet[cf].request)]
      }),
      ...(state.facetSet && { facets: [...Object.keys(state.facetSet).map((f) => state.facetSet[f])] }),
      ...(state.context && { context: state.context.contextValues }),
      ...(state.pipeline && { pipeline: state.pipeline }),
      ...(state.searchHub && { searchHub: state.searchHub })
    };
  };

  function buildCustomCategoryLeafValues(engine, props) {
    const logger = buildLogger({});
    let fieldValues;
    let constantExpression;
    const searchAPIClient = new SearchAPIClient({ logger });
    const options = {
      delimitingCharacter: '|',
      ...props.options
    };
    const fetchFieldValues = async () => {
      var _a, _b;
      const planResponse = await searchAPIClient.plan(buildPlanRequest(engine.state));
      constantExpression = getConstantExpression(planResponse);
      const neededfieldValuesState = {
        ...engine.state,
        ...options,
        constantQueryOverride: constantExpression,
        queryOverride:
          (_b = (_a = engine.state) === null || _a === void 0 ? void 0 : _a.query) === null || _b === void 0
            ? void 0
            : _b.q
      };
      const response = await searchAPIClient.values(buildValuesRequest(neededfieldValuesState));
      fieldValues = response === null || response === void 0 ? void 0 : response.values;
      return {
        ...response
      };
    };
    const getConstantExpression = (response) => {
      let finalExpression = '';
      if (response.success) {
        const { constantExpression, advancedExpression } = new ExecutionPlan(response.success);
        finalExpression = `${advancedExpression} ${constantExpression}`;
        // remove potential filter from current field
        const regEx = new RegExp(`@${options.field}==\([^()]+\)`, 'gmi');
        finalExpression = finalExpression.replace(regEx, '');
      }
      return finalExpression;
    };
    const getLeafValues = (rawValues) => {
      var _a;
      let leafValues = [];
      let tempLeafValues = [];
      const joinedBasePath =
        (_a = options.basePath) === null || _a === void 0 ? void 0 : _a.join(options.delimitingCharacter);
      const filteredRawValues = rawValues.filter((v) => v.value.indexOf(joinedBasePath) >= 0);
      filteredRawValues.forEach((v) => {
        const { numberOfResults, value } = v;
        const levels = value.replace(joinedBasePath, '').split(options.delimitingCharacter);
        const filteredLevels = levels.filter((l) => l !== '');
        if (filteredLevels.length) {
          const leafValue = filteredLevels[filteredLevels.length - 1];
          const firstLevel = filteredLevels[0];
          if (firstLevel !== leafValue && leafValue !== '') {
            tempLeafValues.push({
              displayValue: leafValue,
              numberOfResults,
              value: filteredLevels.join(options.delimitingCharacter)
            });
          }
        }
      });
      if (tempLeafValues.length) {
        leafValues = [...new Set(tempLeafValues)];
      }
      return leafValues;
    };
    return {
      subscribe(listener) {
        // just checking if query or context have changed
        const { context, query } = engine.state;
        const constantExpression = this.constantExpression;
        let prevEngineState = JSON.stringify({ context, query, constantExpression });
        fetchFieldValues().then(listener);
        const unsubscribe = engine.subscribe(() => {
          const { context, query } = engine.state;
          const constantExpression = this.constantExpression;
          const currentEngineState = JSON.stringify({ context, query, constantExpression });
          if (prevEngineState !== currentEngineState) {
            prevEngineState = currentEngineState;
            fetchFieldValues().then(listener);
          }
        });
        return unsubscribe;
      },
      get state() {
        return {
          leafValues: getLeafValues(fieldValues)
        };
      },
      get constantExpression() {
        return constantExpression;
      }
    };
  }

  function buildCustomCategoryFacet(engine, props) {
    // const options = {
    //   ...props.options
    // }
    const baseCategoryFacet = headless.buildCategoryFacet(engine, props);
    // const baseFacet = buildFacet(engine, { options: {
    //   facetId: 'custom_category_facet__baseFacet__' + options.field,
    //   field: options.field,
    //   numberOfValues: 1000
    // }});
    const categoryNavMenuProps = {
      options: {
        ...props.options,
        ignoreQuery: false
      }
    };
    const categoryNavMenu = buildCustomCategoryNavMenu(engine, categoryNavMenuProps);
    // let rootParents: CategoryFacetValue[] = [];
    // let treeValues: any[] = [];
    // let selectedValues: CategoryFacetValue[] = [];
    // const getHierarchicalValues = (rawValues:any[]) => {
    //   const joinedBasePath = options.basePath?.join(options.delimitingCharacter);
    //   const filteredRawValues = joinedBasePath ? rawValues.filter(v => v.value.indexOf(joinedBasePath) >= 0) : rawValues;
    //   const tree = new TreeNode("root", null);
    //   let previousLevel = tree;
    //   filteredRawValues.forEach((v) => {
    //     const {value} = v;
    //     const levels: any[] = value.replace(joinedBasePath, '').split(options.delimitingCharacter).filter((l:string) => l !== '');
    //     levels.forEach((level, idx) => {
    //       let currentLevel = previousLevel.children.find((t)=> t.name === level)
    //       if(!currentLevel) {
    //         currentLevel = new TreeNode(level, {...v, state: 'idle'});
    //         previousLevel.add(currentLevel);
    //       }
    //       previousLevel = levels.length-1 === idx ? tree : currentLevel;
    //     });
    //   });
    //   return tree.children;
    // }
    const updateTreeValues = (selectedValues, nodes) => {
      for (var i = 0, len = nodes.length; i < len; i++) {
        nodes[i].raw.state = 'idle';
        if (selectedValues.find((f) => f.value === nodes[i].name)) {
          nodes[i].raw.state = 'selected';
        }
        updateTreeValues(selectedValues, nodes[i].children);
      }
    };
    // categoryNavMenu.subscribe(() => {
    //   rootParents = [];
    //   const {navMenu, hierarchicalValues} = categoryNavMenu.state;
    //   navMenu.forEach((v) => {
    //     rootParents.push({
    //       value: v.value,
    //       numberOfResults: v.numberOfResults,
    //       state: 'idle',
    //       children: [],
    //       moreValuesAvailable: true,
    //       path: [v.value]
    //     })
    //   })
    //   treeValues = hierarchicalValues
    // })
    // baseFacet.subscribe(() => {
    //   const state = baseFacet.state;
    //   // console.dir(state.values)
    //   treeValues = getHierarchicalValues(state.values);
    // })
    // baseCategoryFacet.subscribe(() => {
    //   selectedValues = [];
    //   selectedValues = selectedValues.concat(
    //     baseCategoryFacet.state.parents.filter((f) => f.state === 'selected'),
    //     baseCategoryFacet.state.values.filter((f) => f.state === 'selected')
    //   )
    //   updateTreeValues(selectedValues, treeValues)
    // })
    // const getRootParents = () => rootParents
    const getSelectedValues = () => {
      let selectedValues = [];
      selectedValues = selectedValues.concat(
        baseCategoryFacet.state.parents.filter((f) => f.state === 'selected'),
        baseCategoryFacet.state.values.filter((f) => f.state === 'selected')
      );
      return selectedValues;
    };
    // const getTreeValues = () => getHierarchicalValues(baseFacet.state.values)
    const getTreeValues = () => categoryNavMenu.state.hierarchicalValues;
    return {
      ...baseCategoryFacet,
      get state() {
        let treeValues = getTreeValues();
        const selectedValues = getSelectedValues();
        updateTreeValues(selectedValues, treeValues);
        return {
          ...baseCategoryFacet.state,
          treeValues
        };
      },
      subscribe(listener) {
        const subscriptions = [
          baseCategoryFacet.subscribe(() => listener()),
          categoryNavMenu.subscribe(() => listener())
          // baseFacet.subscribe(() => listener())
        ];
        return () => subscriptions.forEach((unsubscribe) => unsubscribe());
      }
    };
  }

  //flex_mode: does not considers
  function buildFieldSuggestion(
    groupName,
    platform_url,
    accessToken,
    organizationId,
    searchHub,
    field,
    filter,
    flex_mode,
    categorypath_separator
  ) {
    let values = [];
    let lastKeywords = '';
    const logger = buildLogger({});
    const api = new SearchAPIClient({ logger });
    let prevState = '';
    const listeners = [];
    const getValues = () => {
      return values;
    };
    const fetchSuggestions = (keywords) => {
      //do not send request if empty string or unchcanged
      if (!keywords.trim() || keywords === lastKeywords) {
        return;
      }
      lastKeywords = keywords;
      let pattern = keywords;
      let patterntype = 'wildcard';
      if (flex_mode) {
        //replace nonalphanum characters with a placeholder: dont match these specifically
        pattern = keywords.trim().replace(/[^a-zA-Z0-9]+/gi, '\\W+');
        pattern = `.*${pattern}.*`;
        patterntype = 'regularexpression';
      } else if (categorypath_separator) {
        pattern = keywords.trim().replace(/[^a-zA-Z0-9]+/gi, '\\W+');
        pattern = `.*${pattern}.*${categorypath_separator}.*`;
        patterntype = 'regularexpression';
      } else {
        pattern = `*${pattern}*`;
      }
      const req = {
        url: platform_url + '/rest/search/v2',
        accessToken,
        organizationId,
        searchHub,
        maximumNumberOfValues: 5,
        field,
        pattern: pattern,
        patternType: patterntype
      };
      api.values(req).then((apiResponse) => {
        const newValues = apiResponse.values.map((newValue) => newValue.value);
        const newState = JSON.stringify(newValues);
        if (newState !== prevState) {
          values = newValues;
          prevState = newState;
        }
        listeners.forEach((listener) => {
          listener();
        });
      });
    };
    return {
      groupName,
      field,
      filter,
      flex_mode,
      categorypath_separator,
      getValues,
      fetchSuggestions,
      subscribe(listener) {
        listeners.push(listener);
      }
    };
  }

  exports.buildCustomCategoryFacet = buildCustomCategoryFacet;
  exports.buildCustomCategoryLeafValues = buildCustomCategoryLeafValues;
  exports.buildCustomCategoryNavMenu = buildCustomCategoryNavMenu;
  exports.buildCustomSearchBox = buildCustomSearchBox;
  exports.buildCustomStandaloneSearchBox = buildCustomStandaloneSearchBox;
  exports.buildFieldSuggestion = buildFieldSuggestion;
  exports.buildOtherSuggestion = buildOtherSuggestion;
  exports.buildPlanRequest = buildPlanRequest;
  exports.buildValuesRequest = buildValuesRequest;

  Object.defineProperty(exports, '__esModule', { value: true });
});
