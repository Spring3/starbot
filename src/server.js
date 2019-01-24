const assert = require('assert');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const { NODE_ENV, USE_PROXY, PORT } = require('./modules/configuration.js');
const Bot = require('./bot/modules/bot.js');
const botStorage = require('./bot/modules/botStorage.js');
const mongo = require('./modules/mongo.js');
const passport = require('./modules/passport.js');

const errorHandler = require('./middlewares/error-handler.js');
const sessionMiddleware = require('./middlewares/session.js');
const routes = require('./routes/index.route.js');

import React from 'react';
import RootPage from './web/views/RootPage.jsx';
import { ServerStyleSheet } from 'styled-components'
const { renderToString } = require('react-dom/server');
const template = require('./web/template.js');

const app = express();

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// hot reload
if (NODE_ENV === 'development') {
  const config = require('../webpack.config.dev.js');
  const webpack = require('webpack');
  const compiler = webpack(config);
  app.use(require('webpack-dev-middleware')(compiler, {
    noInfo: true,
    publicPath: config.output.publicPath,
    stats: {
      assets: false,
			colors: true,
			version: false,
			hash: false,
			timings: false,
			chunks: false,
			chunkModules: false
    }
  }));
  app.use(require('webpack-hot-middleware')(compiler));
	app.use(express.static(path.resolve(__dirname, 'web')));
} else if (NODE_ENV === 'production') {
  app.set('trust proxy', USE_PROXY);
  app.use('/', express.static(path.join(__dirname, '../dist/')));
}

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  const initialState = {
    NODE_ENV,
    randomSeed: new Date().toISOString().substring(0, 10), // YYYY-MM-DD
  };
  const sheet = new ServerStyleSheet();
  const appString = renderToString(sheet.collectStyles(<RootPage {...initialState} />));
  const styleTags = sheet.getStyleTags();
  const response = template({
    jsxString: appString,
    title: 'Starbot Dashboard',
    initialState: JSON.stringify(initialState),
    styles: styleTags
  });
  res.send(response);
});

app.use(routes);
app.use(errorHandler);

async function startExistingBots(db) {
  const existingBots = await db.collection('Bot').find({}).toArray();
  for (const botData of existingBots) {
    const bot = new Bot(botData);
    const { teamId } = botData;
    assert(teamId, 'botData must have teamId');
    botStorage.activeBots.set(teamId, bot);
    bot.start();
  }
};

app.listen(PORT, async () => {
  console.log(`Server is up on port ${PORT}`);
  try {
    await mongo.connect().then((db) => {
      if (NODE_ENV === 'production') {
        startExistingBots(db);
      }
    });
    console.log('Connected to the database');
  } catch (e) {
    console.error('Failed to connect to the database', e);
  }
});

function shutdown() {
  botStorage.shutdown();
  mongo.disconnect();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
