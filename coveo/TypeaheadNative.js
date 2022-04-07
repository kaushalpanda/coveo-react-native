import React, { memo, useEffect, useState } from "react";
import { Text } from "react-native";

const TypeaheadNative = (props) => {
  const {
    myCustomStandaloneSearchBox,
    navigation,
    route,
    isCreditCustomer = true,
  } = props;
  const [searchState, setSearchState] = useState(
    myCustomStandaloneSearchBox?.state
  );
  const [isOpen, setIsOpen] = useState(true);
  const [rangeScroll, setRangeScroll] = useState(false);
  const [groupResultRange, setGroupResultRange] = useState([]);
  const isDevelopment = process.env.NODE_ENV === "development";
  const {
    productslabel,
    productscount,
    categorieslabel,
    categoriescount,
    searchtermslabel,
    searchtermscount,
    relatedinfolabel,
    relatedinfocount,
  } = {};

  useEffect(() => {
    setGroupResultRange([
      {
        group: productslabel || "Products",
        key: "ProductSuggestions",
        range: productscount || 4,
      },
      {
        group: categorieslabel || "Categories",
        key: "L2Categories",
        range: categoriescount || 3,
      },
      {
        group: searchtermslabel || "Search Terms",
        key: "default",
        range: searchtermscount || 3,
      },
      {
        group: relatedinfolabel || "Related Info",
        key: "RelatedContentSuggestions",
        range: relatedinfocount || 3,
      },
    ]);
  }, [
    productslabel,
    productscount,
    categorieslabel,
    categoriescount,
    searchtermslabel,
    searchtermscount,
    relatedinfolabel,
    relatedinfocount,
  ]);

  const updateState = () => {
    setSearchState(myCustomStandaloneSearchBox?.state);
    // console.dir('myCustomStandaloneSearchBox?.state', myCustomStandaloneSearchBox?.state);
  };
  useEffect(() => {
    //Register our handler.
    myCustomStandaloneSearchBox.subscribe(updateState);
  }, []);
  useEffect(() => {
    if (searchState) {
      const search = "test";
      if (search) {
        const state = { ...searchState };
        state.value = search;
        setSearchState(state);
      }
    }
  }, []);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e?.target?.matches(".formContainer")) {
        setIsOpen(false);
      }
    };
    //document.addEventListener('click', handleClickOutside);
  }, [isOpen]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
  };
  const removeSpecialChar = (str) => {
    return str.replace(/[^a-zA-Z0-9]/g, "");
  };
  // const handleItemClick = async (item) => {
  //   myCustomStandaloneSearchBox.updateText(item?.rawValue);
  //   if (item?.group.toLowerCase().includes('product')) {
  //     const productId = item?.result?.ClickUri?.split('/')[2];
  //     const formatedPId = ('0000000' + productId).slice(-7);
  //     // window.location.href = config.pagePaths.productPage + '/' + '0' + productId + '.html';
  //     window.location.href = isDevelopment
  //       ? window.location.origin +
  //         config.pagePaths.productPage +
  //         '/' +
  //         formatedPId +
  //         '/' +
  //         removeSpecialChar(item?.rawValue.toString()) +
  //         '.html'
  //       : window.location.origin +
  //         config.pagePaths.productPage +
  //         '/' +
  //         formatedPId +
  //         '/' +
  //         removeSpecialChar(item?.rawValue.toString()) +
  //         '/';
  //   } else if (item?.group.toLowerCase().includes('default')) {
  //     window.location.href = `${config?.pagePaths?.searchPage}?q=${item?.rawValue}`;
  //   } else if (item?.group.toLowerCase().includes('related')) {
  //     window.location.href = item?.result?.ClickUri;
  //   } else if (item?.group.toLowerCase().includes('categories')) {
  //     window.location.href = item?.path;
  //   }
  //   setIsOpen(false);
  // };
  // const onEnterKeyPressed = (e, item) => {
  //   if (e.key === ENTER_KEY) {
  //     handleItemClick(item);
  //   }
  // };

  const renderGroup = (group) => {
    if (groupResultRange) {
      const currentGroup = groupResultRange.filter((result) =>
        group?.toLowerCase().includes(result?.key?.toLowerCase())
      );
      if (currentGroup.length > 0) return currentGroup[0].group;
      else return "";
    }
  };

  const getSuggestions = () => {
    if (searchState?.value) {
      const suggestion = searchState?.groups?.filter(
        (item, index) => searchState?.groups.indexOf(item) === index
      );
      suggestion.forEach((item) => {
        if (item.name.toLowerCase().includes("product")) {
          item.pos = 1;
        } else if (item.name.toLowerCase().includes("categories")) {
          item.pos = 2;
        } else if (item.name.toLowerCase().includes("default")) {
          item.pos = 3;
        } else if (item.name.toLowerCase().includes("related")) {
          item.pos = 4;
        }
      });
      suggestion.sort((group1, group2) => group1.pos - group2.pos);
      return suggestion.map((item) => item.name);
    } else return [];
  };
  // const renderSuggestion = (group) => {
  //   var suggestions = searchState?.newSuggestions?.filter((item) => item.group === group);
  //   if (groupResultRange) {
  //     const currentGroup = groupResultRange.filter((result) => group.toLowerCase().includes(result?.key.toLowerCase()));
  //     if (currentGroup.length > 0) suggestions.splice(currentGroup[0]?.range, suggestions?.length - 1);
  //   }
  //   return suggestions?.length > 0 && isOpen ? ( // toggle here
  //     <>
  //       <div className="borderBottom">
  //         <span className="groupHeader">{renderGroup(group)}</span>
  //         {suggestions.map((item) => (
  //           <div tabIndex={0} className="listItems" onClick={() => handleItemClick(item)}>
  //             <li
  //               tabIndex={-1}
  //               onKeyPress={(e) => onEnterKeyPressed(e, item)}
  //               id={item.highlightedValue}
  //               aria-selected="false"
  //               role="option"
  //               dangerouslySetInnerHTML={{ __html: item.highlightedValue }}
  //             ></li>
  //             <span>
  //               <ArrowRight />
  //             </span>
  //           </div>
  //         ))}
  //       </div>
  //     </>
  //   ) : null;
  // };
  return (
    <Text style={{ color: "red" }}>
      UI has rendered. Please use your own search UI here.
    </Text>
  );
};

export default memo(TypeaheadNative);
