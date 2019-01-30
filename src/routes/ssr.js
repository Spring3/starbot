import React from 'react';
import { StaticRouter, matchPath } from 'react-router-dom';
import App from '../web/App.jsx';
import { ServerStyleSheet } from 'styled-components'
const { renderToString } = require('react-dom/server');
const template = require('../web/template.js');
const { NODE_ENV } = require('../modules/configuration.js');
import ClientRoutes from '../web/views/routes';

module.exports = (req, res) => {
  const context = { };
  const initialState = {
    NODE_ENV,
    user: req.user
  };
  if (req.url === '/') {
    initialState.randomSeed = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
  }

  const sheet = new ServerStyleSheet();
  const jsxString = renderToString(sheet.collectStyles(
    <StaticRouter location={req.url} context={context}>
      <App {...initialState} />
    </StaticRouter>
  ));
  const styleTags = sheet.getStyleTags();

  const currentRoute = ClientRoutes.find(route => matchPath(req.url, route));
  if (!currentRoute && !context.url) {
    return res.redirect('/notfound');
  } else if (currentRoute && currentRoute.auth && !req.user) {
    return res.redirect('/');
  }

  return template({
    jsxString,
    title: 'Starbot Dashboard',
    initialState: JSON.stringify(initialState),
    styles: styleTags
  });
}
