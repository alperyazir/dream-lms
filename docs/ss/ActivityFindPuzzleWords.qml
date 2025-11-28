import QtQuick
import QtQuick.Controls

import "../components"
import "components"
import "ActivityPuzzleFindWords.js" as PuzzleLogic

Rectangle {
    id: root
    property string headerText
    property var secretWords: []
    property bool hasPreviousActivity: false
    property bool hasNextActivity: false
    signal closed
    signal prevActivity
    signal nextActivity
    width: parent.width - 10
    height: parent.height
    radius: 30

    ActivityHeader {
        id: header
        headerText: root.headerText
        defaultText: qsTr("Find The Words.")
    }

    Rectangle {
        id: actColumn
        anchors.top: header.bottom
        anchors.bottom: parent.bottom
        anchors.left: settingsColumn.right
        anchors.right: parent.right
        anchors.margins: 20

        Column {
            anchors.left: parent.left
            anchors.right: sentencesRect.left
            anchors.rightMargin: 20
            anchors.verticalCenter: parent.verticalCenter
            spacing: 5

            Repeater {
                id: wordsRepeater
                model: root.secretWords
                Rectangle {
                    property bool isDiscovered: false
                    property string word: modelData
                    width: parent.width
                    height: puzzleListView.height / 25
                    radius: 5

                    FlowText {
                        text: modelData
                        font.strikeout: parent.isDiscovered
                        font.italic: parent.isDiscovered
                        font.bold: true
                    }
                }
            }
        }

        Rectangle {
            id: sentencesRect
            anchors.margins: 2
            width: height
            height: parent.height
            radius: 5
            color: myColors.highlightColor
            z: 1
            border.color: "black"
            anchors.horizontalCenter: parent.horizontalCenter

            ListView {
                id: puzzleListView
                interactive: false
                anchors.fill: parent
                model: puzzleModel
                orientation: Qt.Vertical
                spacing: 0
                delegate: Row {
                    spacing: 0
                    Repeater {
                        model: rowModel
                        Rectangle {
                            id: coverRect
                            width: puzzleListView.width / 15
                            height: puzzleListView.height / 15
                            color: "lightblue"
                            Rectangle {
                                width: parent.width * .93
                                height: parent.height * .93
                                radius: 5
                                color: model.discovered ? model.color : model.selected ? "lightblue" : "white"
                                anchors.centerIn: parent
                                Text {
                                    text: model.letter
                                    font.bold: true
                                    font.pixelSize: 30
                                    anchors.fill: parent
                                    fontSizeMode: Text.Fit
                                    horizontalAlignment: Text.AlignHCenter
                                    verticalAlignment: Text.AlignVCenter
                                }
                            }
                        }
                    }
                }

                MouseArea {
                    property bool started: false
                    property int direction: -1 // 0 dikey, 1 yatay, 2 çapraz
                    property int startX: -1
                    property int startY: -1
                    property var hist: []
                    anchors.fill: parent
                    onPressed: {
                        started: false;
                        if (mouseX % ((puzzleListView.width / 15) + puzzleListView.spacing) > puzzleListView.width / 15) {
                            return;
                        }

                        if (mouseY % ((puzzleListView.height / 15) + puzzleListView.spacing) > puzzleListView.height / 15) {
                            return;
                        }
                        started = true;

                        direction = -1;
                        startY = parseInt(mouseX / (puzzleListView.width / 15 + puzzleListView.spacing));
                        startX = parseInt(mouseY / (puzzleListView.height / 15 + puzzleListView.spacing));
                        puzzleModel.get(startX).rowModel.get(startY).selected = true;
                        hist = [];
                        hist.push([startX, startY]);
                    }

                    onPositionChanged: {
                        if (!started) {
                            return;
                        }

                        if (mouseX % ((puzzleListView.width / 15) + puzzleListView.spacing) > puzzleListView.width / 15) {
                            return;
                        }

                        if (mouseY % ((puzzleListView.height / 15) + puzzleListView.spacing) > puzzleListView.height / 15) {
                            return;
                        }

                        var secondY = parseInt((mouseX) / (puzzleListView.width / 15 + puzzleListView.spacing));
                        var secondX = parseInt((mouseY) / (puzzleListView.height / 15 + puzzleListView.spacing));

                        if (!puzzleModel.get(secondX).rowModel.get(secondY).selected) {
                            if ((direction === -1 || direction === 0) && (Math.abs(secondX - hist[hist.length - 1][0]) > 0 && Math.abs(secondY - hist[hist.length - 1][1]) === 0)) {
                                direction = 0;
                                puzzleModel.get(secondX).rowModel.get(secondY).selected = true;
                                hist.push([secondX, secondY]);
                            } else if ((direction === -1 || direction === 1) && (Math.abs(secondX - hist[hist.length - 1][0]) === 0 && Math.abs(secondY - hist[hist.length - 1][1]) > 0)) {
                                direction = 1;
                                puzzleModel.get(secondX).rowModel.get(secondY).selected = true;
                                hist.push([secondX, secondY]);
                            } /*else if((direction === -1 || direction === 2) && (Math.abs(secondX - hist[hist.length-1].x) > 0 && Math.abs(secondY - hist[hist.length-1].y) > 0)) {
                                direction = 2
                                puzzleModel.get(secondX).rowModel.get(secondY).selected = true
                                hist.push({"x": secondX, "y": secondY})
                            }*/

                        } else if (puzzleModel.get(secondX).rowModel.get(secondY).selected) {
                            if (hist.length > 2) {
                                if (hist[hist.length - 2][0] === secondX && hist[hist.length - 2][1] === secondY) {
                                    puzzleModel.get(hist[hist.length - 1][0]).rowModel.get(hist[hist.length - 1][1]).selected = false;
                                    hist.pop();
                                }
                            } else if (hist.length === 2) {
                                if (hist[0][0] === secondX && hist[0][1] === secondY) {
                                    puzzleModel.get(hist[1][0]).rowModel.get(hist[1][1]).selected = false;
                                    direction = -1;
                                    hist.pop();
                                }
                            }
                        }
                    }

                    onReleased: {
                        var correctWord = PuzzleLogic.isCoordinateMatch(hist, PuzzleLogic.allWordsCoordinates);
                        if (correctWord) {
                            // change color
                            var nColor = PuzzleLogic.getRandomColor();
                            var selectedWord = "";
                            for (var l = 0; l < hist.length; l++) {
                                puzzleModel.get(hist[l][0]).rowModel.get(hist[l][1]).color = nColor;
                                puzzleModel.get(hist[l][0]).rowModel.get(hist[l][1]).discovered = true;
                                selectedWord += puzzleModel.get(hist[l][0]).rowModel.get(hist[l][1]).letter;
                            }

                            for (var i = 0; i < wordsRepeater.count; i++) {
                                if (selectedWord === wordsRepeater.itemAt(i).word) {
                                    wordsRepeater.itemAt(i).isDiscovered = true;
                                }
                            }
                        } else {
                            // unselect selection
                            for (var m = 0; m < hist.length; m++) {
                                puzzleModel.get(hist[m][0]).rowModel.get(hist[m][1]).selected = false;
                            }
                        }
                    }
                }
            }

            ListModel {
                id: puzzleModel
            }
        }
    }

    Column {
        id: settingsColumn
        width: parent.width * 100 / 1920
        z: 2
        anchors.right: parent.left
        anchors.rightMargin: 15
        anchors.verticalCenter: parent.verticalCenter

        SettingsButton {
            id: showAnswersButton
            property bool eyeState: false
            width: parent.width
            height: width
            iconSource: !eyeState ? "qrc:/icons/eye_open.png" : "qrc:/icons/eye_closed.png"
            onButtonClicked: {
                sound.playSound(mySounds.clickAnswer);
                eyeState = !eyeState;
                for (var i = 0; i < PuzzleLogic.allWordsCoordinates.length; i++) {
                    var nColor = PuzzleLogic.getRandomColor();
                    for (var j = 0; j < PuzzleLogic.allWordsCoordinates[i].length; j++) {
                        puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).discovered = eyeState;
                        puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).color = eyeState ? nColor : "white";
                        if (!eyeState) {
                            puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).selected = false;
                        }
                    }
                }

                for (var i = 0; i < wordsRepeater.count; i++) {
                    wordsRepeater.itemAt(i).isDiscovered = eyeState;
                }
            }
        }

        SettingsButton {
            id: findNextAnswer
            width: parent.width
            height: width
            iconSource: "qrc:/icons/arrowRight.png"
            onButtonClicked: {
                sound.playSound(mySounds.clickAnswer);
                for (var i = 0; i < PuzzleLogic.allWordsCoordinates.length; i++) {
                    var discovered = false;
                    var nColor = PuzzleLogic.getRandomColor();
                    var selectedWord = "";
                    for (var j = 0; j < PuzzleLogic.allWordsCoordinates[i].length; j++) {
                        if (!puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).discovered) {
                            puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).discovered = true;
                            puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).color = nColor;
                            discovered = true;
                            selectedWord += puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).letter;
                        } else {
                            selectedWord += puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).letter;
                        }
                    }

                    for (var k = 0; k < wordsRepeater.count; k++) {
                        if (selectedWord === wordsRepeater.itemAt(k).word) {
                            wordsRepeater.itemAt(k).isDiscovered = true;
                        }
                    }

                    if (discovered)
                        break;
                }
            }
        }

        SettingsButton {
            id: clearButton
            width: parent.width
            height: width
            iconSource: "qrc:/icons/clear.png"
            onButtonClicked: {
                sound.playSound(mySounds.clickAnswer);
                for (var i = 0; i < PuzzleLogic.allWordsCoordinates.length; i++) {
                    for (var j = 0; j < PuzzleLogic.allWordsCoordinates[i].length; j++) {
                        puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).discovered = false;
                        puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).color = "white";
                        puzzleModel.get(PuzzleLogic.allWordsCoordinates[i][j][0]).rowModel.get(PuzzleLogic.allWordsCoordinates[i][j][1]).selected = false;
                    }
                }

                for (var i = 0; i < wordsRepeater.count; i++) {
                    wordsRepeater.itemAt(i).isDiscovered = false;
                }
            }
        }

        SettingsButton {
            id: resetButton
            width: parent.width
            height: width
            iconSource: "qrc:/icons/undo.png"
            onButtonClicked: {
                sound.playSound(mySounds.clickAnswer);
                reset();
            }
        }

        SettingsButton {
            id: closeButton
            width: parent.width
            height: width
            iconSource: "qrc:/icons/close.png"
            onButtonClicked: {
                reset();
                root.visible = false;
                root.closed();
                root.destroy();

                sound.playSound(mySounds.clickAnswer);
            }
        }
    }

    function reset() {
        showAnswersButton.eyeState = false;
        PuzzleLogic.recreatePuzzle();

        for (var i = 0; i < wordsRepeater.count; i++) {
            wordsRepeater.itemAt(i).isDiscovered = false;
        }
    }

    function setWords(words) {
        PuzzleLogic.words = words;
        PuzzleLogic.recreatePuzzle();
    }

    // Navigation buttons at bottom corners
    PrevActivityButton {
        id: prevButton
        
        enabled: true // You can bind this to a property that tracks if there's a previous activity
        visible: settings.passingbetweenActivitiesEnabled && hasPreviousActivity
        onPrevActivityClicked: {
            sound.playSound(mySounds.clickAnswer);
            // Emit signal for previous activity
            root.prevActivity();
        }
    }

    NextActivityButton {
        id: nextButton
        
        enabled: true // You can bind this to a property that tracks if there's a next activity
        visible: settings.passingbetweenActivitiesEnabled && hasNextActivity
        onNextActivityClicked: {
            sound.playSound(mySounds.clickAnswer);
            // Emit signal for next activity
            root.nextActivity();
        }
    }
}
