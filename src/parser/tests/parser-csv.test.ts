// node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// libs
import { expect, test } from 'vitest';

// test functions
import { parseStream } from '../parser.ee.js';

const csvPath = path.join(import.meta.dirname, 'sampleFiles', 'test.csv');
// eslint-disable-next-line security/detect-non-literal-fs-filename
const csvDocument = await readFile(csvPath);
const expectedOutput = `text,list,region
"gravida. Aliquam tincidunt, nunc ac mattis ornare, lectus ante dictum mi, ac mattis velit justo nec ante. Maecenas mi felis, adipiscing fringilla, porttitor vulputate, posuere vulputate, lacus. Cras interdum. Nunc sollicitudin commodo ipsum. Suspendisse non leo. Vivamus nibh dolor, nonummy ac, feugiat non, lobortis quis, pede. Suspendisse dui. Fusce diam nunc, ullamcorper eu, euismod ac, fermentum vel, mauris. Integer sem elit, pharetra ut, pharetra sed, hendrerit a, arcu. Sed et libero. Proin mi. Aliquam gravida mauris ut mi. Duis risus odio, auctor vitae, aliquet nec, imperdiet nec, leo. Morbi neque tellus, imperdiet non, vestibulum nec, euismod in, dolor. Fusce feugiat.",7,Emilia-Romagna
"vestibulum, neque sed dictum eleifend, nunc risus varius orci, in consequat enim diam vel arcu. Curabitur ut odio vel est tempor bibendum. Donec felis orci, adipiscing non, luctus sit amet, faucibus ut, nulla. Cras eu tellus eu augue porttitor interdum. Sed auctor odio a purus. Duis elementum, dui quis accumsan convallis, ante lectus convallis est, vitae sodales nisi magna sed dui. Fusce aliquam, enim nec tempus scelerisque, lorem ipsum sodales purus, in molestie tortor nibh sit amet orci. Ut sagittis lobortis mauris. Suspendisse aliquet molestie tellus. Aenean egestas hendrerit neque. In ornare sagittis felis. Donec tempor, est ac mattis semper,",13,Quindío
"sed pede. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Proin vel arcu eu odio tristique pharetra. Quisque ac libero nec ligula consectetuer rhoncus. Nullam velit dui, semper et, lacinia vitae, sodales at, velit. Pellentesque ultricies dignissim lacus. Aliquam rutrum lorem ac risus. Morbi metus. Vivamus euismod urna. Nullam lobortis quam a felis ullamcorper viverra. Maecenas iaculis aliquet diam. Sed diam lorem, auctor quis, tristique ac, eleifend vitae, erat. Vivamus nisi. Mauris nulla. Integer urna. Vivamus molestie dapibus ligula. Aliquam erat volutpat. Nulla dignissim. Maecenas ornare egestas ligula. Nullam feugiat placerat velit. Quisque varius. Nam porttitor",1,Maranhão`;

test('the parser can extract information from a csv file', async () => {
  const result = await parseStream({
    binaryStream: csvDocument,
    documentName: 'test',
    mimeType: 'text/csv',
  });

  expect(result.split(/\s+/).join(' ')).toContain(
    expectedOutput.split(/\s+/).join(' '),
  );
});

test('the parser can extract information from a csv file without mime type', async () => {
  const result = await parseStream({
    binaryStream: csvDocument,
    documentName: 'test.csv',
    mimeType: undefined,
  });

  expect(result.split(/\s+/).join(' ')).toContain(
    expectedOutput.split(/\s+/).join(' '),
  );
});
