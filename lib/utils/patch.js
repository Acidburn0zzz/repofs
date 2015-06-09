var _ = require('lodash');
var diffMatchPatch = require('diff-match-patch-node');

function ltrim(str, charlist) {
    charlist = !charlist ? ' \\s\u00A0' : (charlist + '')
        .replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '$1');
    var re = new RegExp('^[' + charlist + ']+', 'g');
    return (str + '')
        .replace(re, '');
}


// Return diff as a string between 2 strings
function createFromCompare(from, to) {
    var dmp = diffMatchPatch();
    var a = dmp.diff_linesToChars_(from, to);
    var diffs = dmp.diff_main(a.chars1, a.chars2, false);
    dmp.diff_charsToLines_(diffs, a.lineArray);
    var patches = dmp.patch_make(diffs);
    return dmp.patch_toText(patches);
}

// Parse a diff from git
function parseDiff(input) {
    var add, chunk, del, deleted_file, file, files,
    from_file, i, index, len, line, lines, ln_add, ln_del,
    new_file, noeol, normal, parse, restart, schema, start, to_file;

    if (!input) return [];
    if (input.match(/^\s+$/)) return [];
    lines = input.split('\n');
    if (lines.length === 0) return [];

    files = [];
    file = null;
    ln_del = 0;
    ln_add = 0;
    start = function() {
        file = {
            lines: [],
            deletions: 0,
            additions: 0
        };
        return files.push(file);
    };
    restart = function() {
        if (!file || file.lines.length) {
            return start();
        }
    };
    new_file = function() {
        restart();
        return file["new"] = true;
    };
    deleted_file = function() {
        restart();
        return file.deleted = true;
    };
    index = function(line) {
        restart();
        return file.index = line.split(' ').slice(1);
    };
    from_file = function(line) {
        restart();
        return file.from = parseFile(line);
    };
    to_file = function(line) {
        restart();
        return file.to = parseFile(line);
    };
    chunk = function(line, match) {
        ln_del = +match[1];
        ln_add = +match[3];
        return file.lines.push({
            type: 'chunk',
            chunk: true,
            content: line
        });
    };
    del = function(line) {
        file.lines.push({
            type: 'del',
            del: true,
            ln: ln_del++,
            content: line
        });
        return file.deletions++;
    };
    add = function(line) {
        file.lines.push({
            type: 'add',
            add: true,
            ln: ln_add++,
            content: line
        });
        return file.additions++;
    };
    noeol = '\\ No newline at end of file';
    normal = function(line) {
        if (!file) {
            return;
        }
        return file.lines.push({
            type: 'normal',
            normal: true,
            ln1: line !== noeol ? ln_del++ : void 0,
            ln2: line !== noeol ? ln_add++ : void 0,
            content: line
        });
    };
    schema = [[/^diff\s/, start], [/^new file mode \d+$/, new_file], [/^deleted file mode \d+$/, deleted_file], [/^index\s[\da-zA-Z]+\.\.[\da-zA-Z]+(\s(\d+))?$/, index], [/^---\s/, from_file], [/^\+\+\+\s/, to_file], [/^@@\s+\-(\d+),?(\d+)?\s+\+(\d+),?(\d+)?\s@@/, chunk], [/^-/, del], [/^\+/, add]];
    parse = function(line) {
        var i, len, m, p;
        for (i = 0, len = schema.length; i < len; i++) {
            p = schema[i];
            m = line.match(p[0]);
            if (m) {
                p[1](line, m);
                return true;
            }
        }
        return false;
    };
    for (i = 0, len = lines.length; i < len; i++) {
        line = lines[i];
        if (!parse(line)) {
            normal(line);
        }
    }
    return files;
};

function parseFile(s) {
    var t;
    s = ltrim(s, '-');
    s = ltrim(s, '+');
    s = s.trim();
    t = /\d{4}-\d\d-\d\d\s\d\d:\d\d:\d\d(.\d+)?\s(\+|-)\d\d\d\d/.exec(s);
    if (t) {
        s = s.substring(0, t.index).trim();
    }
    if (s.match(/^(a|b)\//)) {
        return s.substr(2);
    } else {
        return s;
    }
}

// Parse a patch to extract additions/deletions
function parsePatch(patch) {
    var parsed = _.first(parseDiff("--- /dev/null\n+++ b/tmp\n"+patch));

    return {
        text: patch,
        additions: parsed.additions,
        deletions: parsed.deletions,
        lines: parsed.lines
    };
}

module.exports = {
    compare: createFromCompare,
    parse: parsePatch
};
