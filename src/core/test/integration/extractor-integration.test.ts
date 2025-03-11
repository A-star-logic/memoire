import { extractFromUrl } from '../../extractor.js';

const response = await extractFromUrl({
  url: 'https://github.com/A-star-logic/memoire/blob/55b335cc3648a9cac64fa551877d8bc5200f3fc0/src/files-parsing/tests/sampleFiles/test.docx',
});
