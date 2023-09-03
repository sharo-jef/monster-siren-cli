#!/usr/bin/env node
/* eslint-disable no-unused-expressions */
/* eslint-disable no-shadow */

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';

import axios from 'axios';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const api = axios.create({
  baseURL: 'https://monster-siren.hypergryph.com/api',
});

const print = (data, prettyPrint) => {
  if (prettyPrint) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(data));
  }
};

yargs(hideBin(process.argv))
  .demandCommand()
  .strictCommands()
  .strictOptions()
  .option('pretty', {
    alias: 'p',
    type: 'boolean',
    description: 'Pretty print',
  })
  .command(
    'album',
    'Album features',
    yargs => yargs
      .demandCommand()
      .command(
        'list',
        'List all albums',
        yargs => yargs,
        argv => api.get('/albums').then(data => print(data.data.data, argv.pretty)),
      )
      .command(
        'get',
        'Get album by id',
        yargs => yargs
          .option('id', {
            alias: 'i',
            type: 'number',
            demandOption: true,
            description: 'Album id',
          })
          .option('detail', {
            alias: 'd',
            type: 'boolean',
            description: 'Get album detail',
          }),
        argv => (argv.detail ? api.get(`/album/${argv.id}/detail`) : api.get(`/album/${argv.id}/data`))
          .then(data => print(data.data.data, argv.pretty)),
      )
      .command(
        'download',
        'Download album by id',
        yargs => yargs
          .option('id', {
            alias: 'i',
            type: 'number',
            demandOption: true,
            description: 'Album id',
          })
          .option('output', {
            alias: 'o',
            type: 'string',
            description: 'Output directory',
          }),
        async argv => {
          const { name, songs } = await api.get(`/album/${argv.id}/detail`).then(data => data.data.data);
          if (!name || !songs || songs.length === 0) {
            throw new Error(`Invalid album id: ${argv.id}`);
          }
          const directory = argv.output || name;
          await mkdir(directory, { recursive: true });
          for (const song of songs) {
            const { sourceUrl } = await api.get(`/song/${song.cid}`).then(data => data.data.data);
            if (!sourceUrl) {
              throw new Error(`Invalid song id: ${song.cid}`);
            }
            const { data } = await axios.get(sourceUrl, { responseType: 'stream' });
            data.pipe(createWriteStream(`${directory}/${song.name}.${sourceUrl.split('.').pop()}`));
          }
        },
      ),
  )
  .command(
    'song',
    'Song features',
    yargs => yargs
      .demandCommand()
      .command(
        'list',
        'List all songs',
        yargs => yargs,
        argv => api.get('/songs').then(data => print(data.data.data.list, argv.pretty)),
      )
      .command(
        'get',
        'Get song by id',
        yargs => yargs
          .option('id', {
            alias: 'i',
            type: 'number',
            demandOption: true,
            description: 'Song id',
          }),
        argv => api.get(`/song/${argv.id}`).then(data => print(data.data.data, argv.pretty)),
      )
      .command(
        'download',
        'Download song by id',
        yargs => yargs
          .option('id', {
            alias: 'i',
            type: 'number',
            demandOption: true,
            description: 'Song id',
          })
          .option('output', {
            alias: 'o',
            type: 'string',
            description: 'Output file',
          }),
        async argv => {
          const { sourceUrl, name } = await api.get(`/song/${argv.id}`).then(data => data.data.data);
          if (!sourceUrl) {
            throw new Error(`Invalid song id: ${argv.id}`);
          }
          const { data } = await axios.get(sourceUrl, { responseType: 'stream' });
          data.pipe(createWriteStream(argv.output || `${name}.${sourceUrl.split('.').pop()}`));
        },
      ),
  )
  .argv;
