"use strict";
/** @license
 * JSON Kifu Format
 * Copyright (c) 2014 na2hiro (https://github.com/na2hiro)
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var ShogiJS = require('shogi.js/lib/shogi');
var Color = ShogiJS.Color;
var Piece = ShogiJS.Piece;
var Shogi = ShogiJS.Shogi;
var Normalizer = require('./normalizer');
var kifParser = require("../lib/kif-parser");
var ki2Parser = require("../lib/ki2-parser");
var csaParser = require("../lib/csa-parser");
var JKFPlayer = (function () {
    function JKFPlayer(kifu) {
        this.shogi = new Shogi(kifu.initial || undefined);
        this.initialize(kifu);
    }
    JKFPlayer.log = function () {
        var lg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            lg[_i - 0] = arguments[_i];
        }
        if (JKFPlayer.debug) {
            console.log(lg);
        }
        else {
            JKFPlayer._log.push(lg);
        }
    };
    JKFPlayer.prototype.initialize = function (kifu) {
        this.kifu = kifu;
        this.tesuu = 0;
        this.forks = [{ te: 0, moves: this.kifu.moves }];
    };
    JKFPlayer.parse = function (kifu, filename) {
        if (filename) {
            var tmp = filename.split("."), ext = tmp[tmp.length - 1].toLowerCase();
            switch (ext) {
                case "jkf":
                    return JKFPlayer.parseJKF(kifu);
                case "kif":
                case "kifu":
                    return JKFPlayer.parseKIF(kifu);
                case "ki2":
                case "ki2u":
                    return JKFPlayer.parseKI2(kifu);
                case "csa":
                    return JKFPlayer.parseCSA(kifu);
            }
        }
        // 不明
        try {
            return JKFPlayer.parseJKF(kifu);
        }
        catch (e) {
            JKFPlayer.log("failed to parse as jkf", e);
        }
        try {
            return JKFPlayer.parseKIF(kifu);
        }
        catch (e) {
            JKFPlayer.log("failed to parse as kif", e);
        }
        try {
            return JKFPlayer.parseKI2(kifu);
        }
        catch (e) {
            JKFPlayer.log("failed to parse as ki2", e);
        }
        try {
            return JKFPlayer.parseCSA(kifu);
        }
        catch (e) {
            JKFPlayer.log("failed to parse as csa", e);
        }
        throw "JKF, KIF, KI2, CSAいずれの形式でも失敗しました";
    };
    JKFPlayer.parseJKF = function (kifu) {
        JKFPlayer.log("parseJKF", kifu);
        return new JKFPlayer(JSON.parse(kifu));
    };
    JKFPlayer.parseKIF = function (kifu) {
        JKFPlayer.log("parseKIF", kifu);
        return new JKFPlayer(Normalizer.normalizeKIF(kifParser.parse(JKFPlayer.addLastNewLine(kifu))));
    };
    JKFPlayer.parseKI2 = function (kifu) {
        JKFPlayer.log("parseKI2", kifu);
        return new JKFPlayer(Normalizer.normalizeKI2(ki2Parser.parse(JKFPlayer.addLastNewLine(kifu))));
    };
    JKFPlayer.parseCSA = function (kifu) {
        JKFPlayer.log("parseCSA", kifu);
        return new JKFPlayer(Normalizer.normalizeCSA(csaParser.parse(JKFPlayer.addLastNewLine(kifu))));
    };
    JKFPlayer.addLastNewLine = function (kifu) {
        if (kifu.substr(kifu.length - 1) == "\n")
            return kifu;
        return kifu + "\n";
    };
    JKFPlayer.numToZen = function (n) {
        return "０１２３４５６７８９"[n];
    };
    JKFPlayer.numToKan = function (n) {
        return "〇一二三四五六七八九"[n];
    };
    JKFPlayer.kindToKan = function (kind) {
        return {
            "FU": "歩",
            "KY": "香",
            "KE": "桂",
            "GI": "銀",
            "KI": "金",
            "KA": "角",
            "HI": "飛",
            "OU": "玉",
            "TO": "と",
            "NY": "成香",
            "NK": "成桂",
            "NG": "成銀",
            "UM": "馬",
            "RY": "龍"
        }[kind];
    };
    JKFPlayer.relativeToKan = function (relative) {
        return {
            "L": "左",
            "C": "直",
            "R": "右",
            "U": "上",
            "M": "寄",
            "D": "引",
            "H": "打"
        }[relative];
    };
    JKFPlayer.specialToKan = function (special) {
        return {
            "TORYO": "投了",
            "CHUDAN": "中断",
            "SENNICHITE": "千日手",
            "TIME_UP": "時間切れ",
            "ILLEGAL_MOVE": "反則負け",
            "+ILLEGAL_ACTION": "後手反則負け",
            "-ILLEGAL_ACTION": "先手反則負け",
            "JISHOGI": "持将棋",
            "KACHI": "勝ち宣言",
            "HIKIWAKE": "引き分け宣言",
            "MATTA": "待った",
            "TSUMI": "詰",
            "FUZUMI": "不詰",
            "ERROR": "エラー"
        }[special] || special;
    };
    JKFPlayer.moveToReadableKifu = function (mv) {
        if (mv.special) {
            return JKFPlayer.specialToKan(mv.special);
        }
        var move = mv.move;
        var ret = move.color == Color.Black ? "☗" : "☖";
        if (move.same) {
            ret += "同　";
        }
        else {
            ret += JKFPlayer.numToZen(move.to.x) + JKFPlayer.numToKan(move.to.y);
        }
        ret += JKFPlayer.kindToKan(move.piece);
        if (move.relative) {
            ret += move.relative.split("").map(JKFPlayer.relativeToKan).join("");
        }
        if (move.promote != null) {
            ret += move.promote ? "成" : "不成";
        }
        return ret;
    };
    JKFPlayer.doMove = function (shogi, move) {
        if (!move)
            return;
        if (move.from) {
            shogi.move(move.from.x, move.from.y, move.to.x, move.to.y, move.promote);
        }
        else {
            shogi.drop(move.to.x, move.to.y, move.piece, typeof move.color != "undefined" ? move.color : void 0);
        }
    };
    JKFPlayer.undoMove = function (shogi, move) {
        if (!move)
            return;
        if (move.from) {
            shogi.unmove(move.from.x, move.from.y, move.to.x, move.to.y, move.promote, move.capture);
        }
        else {
            shogi.undrop(move.to.x, move.to.y);
        }
    };
    JKFPlayer.getState = function (shogi) {
        return {
            color: shogi.turn,
            board: JKFPlayer.getBoardState(shogi),
            hands: JKFPlayer.getHandsState(shogi)
        };
    };
    // 1手進める
    JKFPlayer.prototype.forward = function () {
        if (!this.getMoveFormat(this.tesuu + 1))
            return false;
        this.tesuu++;
        var move = this.getMoveFormat(this.tesuu).move;
        if (!move)
            return true;
        JKFPlayer.log("forward", this.tesuu, move);
        this.doMove(move);
        return true;
    };
    // 1手戻す
    JKFPlayer.prototype.backward = function () {
        var _this = this;
        if (this.tesuu <= 0)
            return false;
        var move = this.getMoveFormat(this.tesuu).move;
        JKFPlayer.log("backward", this.tesuu - 1, move);
        this.undoMove(move);
        this.tesuu--;
        this.forks = this.forks.filter(function (fork) { return fork.te <= _this.tesuu; });
        return true;
    };
    // tesuu手目へ行く
    JKFPlayer.prototype.goto = function (tesuu) {
        var limit = 10000; // for safe
        if (this.tesuu < tesuu) {
            while (this.tesuu != tesuu && this.forward() && limit-- > 0)
                ;
        }
        else {
            while (this.tesuu != tesuu && this.backward() && limit-- > 0)
                ;
        }
        if (limit == 0)
            throw "tesuu overflows";
    };
    // tesuu手前後に移動する
    JKFPlayer.prototype.go = function (tesuu) {
        this.goto(this.tesuu + tesuu);
    };
    // 現在の局面から別れた分岐のうちnum番目の変化へ1つ進む
    JKFPlayer.prototype.forkAndForward = function (num) {
        var forks = this.getMoveFormat(this.tesuu + 1).forks;
        if (!forks || forks.length <= num)
            return false;
        this.forks.push({ te: this.tesuu + 1, moves: forks[num] });
        return this.forward();
    };
    // 現在の局面から新しいかもしれない手を1手動かす．
    // 必要フィールドは，指し: from, to, promote(成れる場合のみ)．打ち: to, piece
    // 新しい手の場合，最終手であれば手を追加，そうでなければ分岐を追加
    // もしpromoteの可能性があればfalseを返して何もしない
    // 成功すればその局面に移動してtrueを返す．
    JKFPlayer.prototype.inputMove = function (move) {
        if (this.getMoveFormat().special)
            throw "終了局面へ棋譜を追加することは出来ません";
        if (move.from != null && move.promote == null) {
            var piece = this.shogi.get(move.from.x, move.from.y);
            if (!Piece.isPromoted(piece.kind) && Piece.canPromote(piece.kind) && (Normalizer.canPromote(move.from, piece.color) || Normalizer.canPromote(move.to, piece.color)))
                return false;
        }
        var nextMove = this.getMoveFormat(this.tesuu + 1);
        if (nextMove) {
            if (nextMove.move && JKFPlayer.sameMoveMinimal(nextMove.move, move)) {
                // 次の一手と一致
                this.forward();
                return true;
            }
            if (nextMove.forks) {
                for (var i = 0; i < nextMove.forks.length; i++) {
                    var forkCand = nextMove.forks[i][0];
                    if (forkCand && forkCand.move && JKFPlayer.sameMoveMinimal(forkCand.move, move)) {
                        // 分岐と一致
                        this.forkAndForward(i);
                        return true;
                    }
                }
            }
        }
        this.doMove(move); //動かしてみる(throwされうる)
        var newMove = { move: move };
        var addToFork = this.tesuu < this.getMaxTesuu();
        if (addToFork) {
            // 最終手でなければ分岐に追加
            var next = this.getMoveFormat(this.tesuu + 1);
            if (!next.forks)
                next.forks = [];
            next.forks.push([newMove]);
        }
        else {
            // 最終手に追加
            this.forks[this.forks.length - 1].moves.push(newMove);
        }
        Normalizer.normalizeMinimal(this.kifu); // 復元
        this.undoMove(move);
        // 考え改めて再生
        if (addToFork) {
            this.forkAndForward(next.forks.length - 1);
        }
        else {
            this.forward();
        }
        return true;
    };
    // wrapper
    JKFPlayer.prototype.getBoard = function (x, y) {
        return this.shogi.get(x, y);
    };
    JKFPlayer.prototype.getComments = function (tesuu) {
        if (tesuu === void 0) { tesuu = this.tesuu; }
        return this.getMoveFormat(tesuu).comments || [];
    };
    JKFPlayer.prototype.getMove = function (tesuu) {
        if (tesuu === void 0) { tesuu = this.tesuu; }
        return this.getMoveFormat(tesuu).move;
    };
    JKFPlayer.prototype.getReadableKifu = function (tesuu) {
        if (tesuu === void 0) { tesuu = this.tesuu; }
        if (tesuu == 0)
            return "開始局面";
        return JKFPlayer.moveToReadableKifu(this.getMoveFormat(tesuu));
    };
    JKFPlayer.prototype.getReadableForkKifu = function (tesuu) {
        if (tesuu === void 0) { tesuu = this.tesuu; }
        return this.getNextFork(tesuu).map(function (fork) { return JKFPlayer.moveToReadableKifu(fork[0]); });
    };
    JKFPlayer.prototype.getMaxTesuu = function () {
        var nearestFork = this.forks[this.forks.length - 1];
        return nearestFork.te + nearestFork.moves.length - 1;
    };
    JKFPlayer.prototype.toJKF = function () {
        return JSON.stringify(this.kifu);
    };
    // jkf.initial.dataの形式を得る
    JKFPlayer.prototype.getState = function () {
        return JKFPlayer.getState(this.shogi);
    };
    JKFPlayer.prototype.getReadableKifuState = function () {
        var ret = [];
        for (var i = 0; i <= this.getMaxTesuu(); i++) {
            ret.push({ kifu: this.getReadableKifu(i), forks: this.getReadableForkKifu(i - 1), comments: this.getComments(i) });
        }
        return ret;
    };
    // private
    // 現在の局面から分岐を遡った初手から，現在の局面からの本譜の中から棋譜を得る
    JKFPlayer.prototype.getMoveFormat = function (tesuu) {
        if (tesuu === void 0) { tesuu = this.tesuu; }
        for (var i = this.forks.length - 1; i >= 0; i--) {
            var fork = this.forks[i];
            if (fork.te <= tesuu) {
                return fork.moves[tesuu - fork.te];
            }
        }
        throw "指定した手数が異常です";
    };
    JKFPlayer.prototype.getNextFork = function (tesuu) {
        if (tesuu === void 0) { tesuu = this.tesuu; }
        var next = this.getMoveFormat(tesuu + 1);
        return (next && next.forks) ? next.forks : [];
    };
    JKFPlayer.prototype.doMove = function (move) {
        JKFPlayer.doMove(this.shogi, move);
    };
    JKFPlayer.prototype.undoMove = function (move) {
        JKFPlayer.undoMove(this.shogi, move);
    };
    JKFPlayer.sameMoveMinimal = function (move1, move2) {
        return (move1.to.x == move2.to.x && move1.to.y == move2.to.y
            && (move1.from && move2.from
                ? move1.from.x == move2.from.x && move1.from.y == move2.from.y && move1.promote == move2.promote
                : move1.piece == move2.piece));
    };
    JKFPlayer.getBoardState = function (shogi) {
        var ret = [];
        for (var i = 1; i <= 9; i++) {
            var arr = [];
            for (var j = 1; j <= 9; j++) {
                var piece = shogi.get(i, j);
                arr.push(piece ? { color: piece.color, kind: piece.kind } : {});
            }
            ret.push(arr);
        }
        return ret;
    };
    JKFPlayer.getHandsState = function (shogi) {
        return [
            shogi.getHandsSummary(Color.Black),
            shogi.getHandsSummary(Color.White),
        ];
    };
    JKFPlayer.debug = false;
    JKFPlayer._log = [];
    return JKFPlayer;
}());
module.exports = JKFPlayer;
