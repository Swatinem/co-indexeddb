# co-indexeddb

a nice IndexedDB api for co

<!--- badges coming soon, as soon as i figure out how to run slimerjs reliably
[![Build Status](https://travis-ci.org/Swatinem/co-indexeddb.png?branch=master)](https://travis-ci.org/Swatinem/co-indexeddb)
[![Coverage Status](https://coveralls.io/repos/Swatinem/co-indexeddb/badge.png?branch=master)](https://coveralls.io/r/Swatinem/co-indexeddb)
[![Dependency Status](https://gemnasium.com/Swatinem/co-indexeddb.png)](https://gemnasium.com/Swatinem/co-indexeddb)
-->

Although I’m not sure *nice* applies here, since IndexedDB is one of the most
horribly broken APIs I had to work with. Implementing this has me left scarred
for life. And I still don’t know if I even use it correctly. Or how one would
have to use it correctly for that matter. Srsly, who came up with this shit?

## Installation

    $ component install Swatinem/co-indexeddb

## Usage

Take a look at the tests. Most operations that return a request object are
wrapped to work with `yield`. Cursors can be iterated with a `next()` function.

## License

  LGPLv3

