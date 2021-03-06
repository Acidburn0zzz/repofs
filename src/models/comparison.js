const { Record, List } = require('immutable');
const FileDiff = require('./fileDiff');
const Commit = require('./commit');

/**
 * Represents a comparison in the history.
 */

const DEFAULTS = {
    base:    String(),
    head:    String(),
    // Closest parent in the compare
    closest: new Commit(),
    // List of files modified with their SHA and patch.
    files:   List(), // List<FileDiff>
    // List of commits in the range (List<Commit>)
    commits: List()
};

/**
 * @type {Class}
 */
class Comparison extends Record(DEFAULTS) {

    /**
     * @return {Commit}
     */
    static create(opts) {
        if (opts instanceof Comparison) {
            return opts;
        }

        return new Comparison({
            base:    opts.base,
            head:    opts.head,
            closest: Commit.create(opts.closest),
            files:   List(opts.files).map(file => FileDiff.create(file)),
            commits: List(opts.commits).map(commit => Commit.create(commit))
        });
    }

}

module.exports = Comparison;
