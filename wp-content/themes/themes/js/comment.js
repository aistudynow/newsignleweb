
/*!
 * Lightweight vanilla replacement for WP comment-reply behavior.
 * - No jQuery
 * - Uses event delegation (works with dynamically added comments)
 * - Preserves window.addComment.{init,moveForm} API
 */
(function (window, document) {
  'use strict';

  var cfg = {
    commentReplyClass   : 'comment-reply-link',
    commentReplyTitleId : 'reply-title',
    cancelReplyId       : 'cancel-comment-reply-link',
    commentFormId       : 'commentform',
    temporaryFormId     : 'wp-temp-form-div',
    parentIdFieldId     : 'comment_parent',
    postIdFieldId       : 'comment_post_ID'
  };

  var state = {
    cancel: null,
    form: null,
    respond: null,
    delegatedBound: false
  };

  function $(id){ return document.getElementById(id); }

  function on(el, type, handler){ el && el.addEventListener(type, handler, false); }

  function getData(el, name){
    return el.dataset ? el.dataset[name] : el.getAttribute('data-' + name);
  }

  function getDefaultReplyHeading(){
    var node = $(cfg.commentReplyTitleId);
    return node && node.firstChild ? node.firstChild.textContent : '';
  }

  function closest(el, selector){
    if (!el) return null;
    if (el.closest) return el.closest(selector);
    // Tiny fallback for older browsers
    while (el && el.nodeType === 1) {
      if (matches(el, selector)) return el;
      el = el.parentNode;
    }
    return null;
  }

  function matches(el, selector){
    var fn = el.matches || el.webkitMatchesSelector || el.msMatchesSelector || el.mozMatchesSelector;
    return fn ? fn.call(el, selector) : false;
  }

  function addPlaceholder(){
    var ph = $(cfg.temporaryFormId);
    if (ph) return ph;
    ph = document.createElement('div');
    ph.id = cfg.temporaryFormId;
    ph.style.display = 'none';
    ph.textContent = getDefaultReplyHeading();
    state.respond.parentNode.insertBefore(ph, state.respond);
    return ph;
  }

  function restoreHeadingFromPlaceholder(ph){
    var title = $(cfg.commentReplyTitleId);
    if (!title || !title.firstChild) return;

    var linkToParent = title.firstChild.nextSibling;
    if (linkToParent && linkToParent.nodeName === 'A' && linkToParent.id !== cfg.cancelReplyId) {
      linkToParent.style.display = '';
    }
    title.firstChild.textContent = ph && ph.textContent ? ph.textContent : getDefaultReplyHeading();
  }

  function focusFirstField(){
    if (!state.form) return;
    for (var i = 0; i < state.form.elements.length; i++) {
      var el = state.form.elements[i];
      if (el.type === 'hidden' || el.disabled) continue;

      var cs = window.getComputedStyle ? getComputedStyle(el) : el.currentStyle;
      var hidden = (el.offsetWidth <= 0 && el.offsetHeight <= 0) || (cs && cs.visibility === 'hidden');
      if (hidden) continue;

      el.focus();
      break;
    }
  }

  function onCancel(e){
    var ph = $(cfg.temporaryFormId);
    if (!ph || !state.respond) return;

    $(cfg.parentIdFieldId).value = '0';

    ph.parentNode.replaceChild(state.respond, ph);
    state.cancel.style.display = 'none';
    restoreHeadingFromPlaceholder(ph);
    e.preventDefault();
  }

  function onKeySubmit(e){
    if ((e.metaKey || e.ctrlKey) && e.keyCode === 13 && document.activeElement.tagName.toLowerCase() !== 'a') {
      e.preventDefault();
      // WP's submit button id is "submit"
      state.form.submit.click();
    }
  }

  function delegatedClick(e){
    var a = closest(e.target, '.' + cfg.commentReplyClass);
    if (!a) return;

    var commId   = getData(a, 'belowelement');
    var parentId = getData(a, 'commentid');
    var respondId= getData(a, 'respondelement');
    var postId   = getData(a, 'postid');
    var replyTo  = getData(a, 'replyto') || getDefaultReplyHeading();

    if (!commId || !parentId || !respondId || !postId) return;

    var follow = moveForm(commId, parentId, respondId, postId, replyTo);
    if (follow === false) e.preventDefault();
  }

  function moveForm(addBelowId, commentId, respondId, postId, replyTo){
    var addBelow = $(addBelowId);
    state.respond = $(respondId);

    var parentField = $(cfg.parentIdFieldId);
    var postField   = $(cfg.postIdFieldId);

    if (!addBelow || !state.respond || !parentField) return;

    if (replyTo == null) replyTo = getDefaultReplyHeading();

    addPlaceholder();

    if (postId && postField) postField.value = postId;
    parentField.value = commentId;

    if (state.cancel) state.cancel.style.display = '';

    addBelow.parentNode.insertBefore(state.respond, addBelow.nextSibling);

    var title = $(cfg.commentReplyTitleId);
    if (title && title.firstChild && title.firstChild.nodeType === 3) {
      var linkToParent = title.firstChild.nextSibling;
      if (linkToParent && linkToParent.nodeName === 'A' && linkToParent.id !== cfg.cancelReplyId) {
        linkToParent.style.display = 'none';
      }
      title.firstChild.textContent = replyTo;
    }

    if (state.cancel) state.cancel.onclick = function(){ return false; };

    try { focusFirstField(); } catch(_) {}

    // Keep legacy behavior for third-party systems that expect false.
    return false;
  }

  function init(/* context (ignored thanks to delegation) */){
    state.cancel = $(cfg.cancelReplyId);
    state.form   = $(cfg.commentFormId);

    on(state.cancel, 'click', onCancel);
    on(state.form, 'keydown', onKeySubmit);

    if (!state.delegatedBound) {
      state.delegatedBound = true;
      on(document, 'click', delegatedClick);
    }
  }

  function ready(){ init(); }

  if (document.readyState !== 'loading') {
    ready();
  } else {
    on(document, 'DOMContentLoaded', ready);
  }

  // Public API (kept for compatibility)
  window.addComment = {
    init: init,
    moveForm: moveForm
  };
})(window, document);

