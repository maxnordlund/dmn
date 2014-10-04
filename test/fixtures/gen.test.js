var fs = require('co-fs-extra'),
    path = require('path'),
    cli = require('../../lib/cli'),
    dmn = require('../../index');


/**
 * Setup test environment
 */
var tmpPath = path.join(__dirname, '../tmp');

cli.silent = true;


/**
 * Wrap fs thunks, so they can be safely passed to Array.map()
 * (learn more: http://www.wirfs-brock.com/allen/posts/166)
 */
function ensureDir(dir) {
    return fs.ensureDir(dir, 0777);
}

function ensureFile(file) {
    return fs.ensureFile(file);
}


describe('gen', function () {

    /**
     * Test setup / teardown
     */
    beforeEach(function* () {
        yield ensureDir(tmpPath);
        process.chdir(tmpPath);
    });

    afterEach(function* () {
        process.chdir(__dirname);
        yield fs.remove(tmpPath);
    });


    /**
     * Tests
     */
    it('should add ignores with respect to existing .npmignore file', function* () {
        var caseInsensitiveFS = true,
            projectFiles = [
                '.travis.yml',
                'Gulpfile.js',
                'index.js',
                'package.json',
                'HISTORY',
                'Makefile'
            ],

            projectDirs = [
                'lib',
                'test',
                'coverage',
                'benchmark'
            ],

            srcIgnoreFile = [
                '.travis.yml',
                '!Makefile',
                'test',
                'example/',
                '!benchmark/'
            ].join('\r\n');

        yield[
            projectFiles.map(ensureFile),
            projectDirs.map(ensureDir),
            fs.writeFile('.npmignore', srcIgnoreFile)
        ];

        try {
            yield fs.readFile('.NpMiGnore');
        }

        catch (err) {
            caseInsensitiveFS = false;
        }

        var status = yield dmn.gen(tmpPath, {force: true}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: saved');

        if (caseInsensitiveFS) {
            ignoreFile.should.eql([
                '.travis.yml',
                '!Makefile',
                'test',
                'example/',
                '!benchmark/',
                '',
                '.npmignore',
                'coverage/',
                'Gulpfile.js',
                'gulpfile.js',
                'HISTORY',
                'History'
            ].join('\r\n'));
        }

        else {
            ignoreFile.should.eql([
                '.travis.yml',
                '!Makefile',
                'test',
                'example/',
                '!benchmark/',
                '',
                '.npmignore',
                'coverage/',
                'Gulpfile.js',
                'HISTORY'
            ].join('\r\n'));
        }
    });


    it('should create new .npmignore file if it does not exists', function* () {
        var projectDirs = [
            'lib',
            'test',
            'coverage',
            'benchmark'
        ];

        yield projectDirs.map(ensureDir);

        var status = yield dmn.gen(tmpPath, {force: true}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: saved');
        ignoreFile.should.eql([
            '# Generated by dmn (https://github.com/inikulin/dmn)',
            '',
            '.npmignore',
            'benchmark/',
            'coverage/',
            'test/'
        ].join('\r\n'));
    });


    it('should not modify .npmignore if it is already perfect', function* () {
        var projectDirs = [
                'lib',
                'test',
                'coverage',
                'benchmark'
            ],

            srcIgnoreFile = [
                '.npmignore',
                'coverage/',
                'test/',
                'benchmark/'
            ].join('\r\n');

        yield [
            projectDirs.map(ensureDir),
            fs.writeFile('.npmignore', srcIgnoreFile)
        ];

        var status = yield dmn.gen(tmpPath, {force: true}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: already-perfect');
        ignoreFile.should.eql(srcIgnoreFile);

    });


    it('should cancel .npmignore file update on user demand if "force" flag disabled', function* () {
        var projectDirs = [
                'lib',
                'test',
                'coverage',
                'benchmark'
            ],

            srcIgnoreFile = [
                '.npmignore',
                'benchmark/'
            ].join('\r\n');

        yield [
            projectDirs.map(ensureDir),
            fs.writeFile('.npmignore', srcIgnoreFile)
        ];

        cli.confirm = function (what, callback) {
            callback(false);
        };

        var status = yield dmn.gen(tmpPath, {force: false}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: canceled');
        ignoreFile.should.eql(srcIgnoreFile);
    });


    it('should update .npmignore file update on user confirmation if "force" flag disabled', function* () {
        var projectDirs = [
                'lib',
                'test',
                'coverage',
                'benchmark'
            ],

            srcIgnoreFile = [
                '.npmignore',
                'benchmark/'
            ].join('\r\n');

        yield [
            projectDirs.map(ensureDir),
            fs.writeFile('.npmignore', srcIgnoreFile)
        ];

        cli.confirm = function (what, callback) {
            callback(true);
        };

        var status = yield dmn.gen(tmpPath, {force: false}),
            ignoreFile = (yield fs.readFile('.npmignore')).toString();

        status.should.eql('OK: saved');
        ignoreFile.should.eql([
            '.npmignore',
            'benchmark/',
            '',
            'coverage/',
            'test/'
        ].join('\r\n'));
    });
});
