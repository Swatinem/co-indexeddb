
test: lint build/build.js
	@echo "note: this does NOT work in phantomjs currently."
	@echo "      I use a patched component-test that sets up"
	@echo "      a patched non-coffee mocha-phantomjs to use slimerjs"
	./node_modules/.bin/component test phantom --coverage
	@./node_modules/.bin/istanbul report lcov # for html and coveralls
	@./node_modules/.bin/istanbul report text-summary # on the command line

lint:
	-./node_modules/.bin/jshint ./test ./index.js

components: component.json
	./node_modules/.bin/component install --dev
	@touch components

build/build.js: components index.js
	./node_modules/.bin/component build --use component-istanbul --dev

test-coveralls: test
	cat ./coverage/lcov.info | ./node_modules/.bin/coveralls

clean:
	rm -rf build coverage

.PHONY: clean test lint test-coveralls
