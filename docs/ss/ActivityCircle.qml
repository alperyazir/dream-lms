import QtQuick
import QtQuick.Controls

import "../components"
import "components"
import "Particles.js" as Particles

Rectangle {
    id: root
    property string imageSource
    property var answers
    property string audio_path
    property real circleCount
    property string headerText
    property var circleExtra
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
        defaultText: qsTr("Cirle the correct option.")
    }

    Column {
        id: actColumn
        anchors.top: header.bottom
        anchors.bottom: parent.bottom
        anchors.left: settingsColumn.right
        anchors.right: parent.right
        anchors.margins: 20

        Rectangle {
            id: sentencesRect
            width: parent.width
            height: parent.height
            radius: 10
            color: "transparent"
            z: 1
            anchors.horizontalCenter: parent.horizontalCenter

            Image {
                id: activityImage
                anchors.centerIn: parent
                source: imageSource
                antialiasing: true
                smooth: true
                fillMode: Image.PreserveAspectFit
                height: parent.height
                width: parent.width
                anchors.margins: 20

                Repeater {
                    id: answersDropRepeater
                    model: answers
                    Rectangle {
                        id: dropRectangle
                        property bool showAnswer: false
                        property bool isCorrect: modelData.isCorrect
                        property bool resultStatus: false
                        property string selectedColor: myColors.standColor
                        property real xScale: activityImage.paintedWidth / activityImage.sourceSize.width
                        property real yScale: activityImage.paintedHeight / activityImage.sourceSize.height
                        x: (sentencesRect.width / 2 - activityImage.paintedWidth / 2) + modelData.coords.x * xScale
                        y: (sentencesRect.height / 2 - activityImage.paintedHeight / 2) + modelData.coords.y * yScale
                        width: modelData.coords.width * xScale
                        height: modelData.coords.height * yScale
                        color: "transparent"

                        Rectangle {
                            id: answerCircleRectActual
                            anchors.fill: parent
                            visible: showAnswer
                            color: "transparent"
                            radius: 7
                            border.color: selectedColor
                            border.width: 3

                            Image {
                                id: statusImg
                                source: isCorrect ? "qrc:/icons/correct.svg" : "qrc:/icons/incorrect.svg"
                                fillMode: Image.PreserveAspectFit
                                height: mainwindow.height * 30 / 1080
                                x: parent.width - width / 2
                                y: -height / 2
                                visible: resultStatus
                                antialiasing: true
                            }
                        }
                        MouseArea {
                            id: answerArea
                            anchors.fill: parent
                            onClicked: {
                                sound.playSound(mySounds.clickAnswer);

                                if (dropRectangle.showAnswer) {
                                    dropRectangle.showAnswer = false;
                                    return;
                                }

                                // for multi choice
                                if (circleCount === -1) {
                                    dropRectangle.showAnswer = !dropRectangle.showAnswer;
                                    return;
                                }

                                if (circleCount === 0) {
                                    circleCount = 2;
                                }
                                root.handleAnswer(index, circleCount);
                            }
                        }
                    }
                }

                Repeater {
                    id: actualAnswerRepeater
                    model: root.circleExtra
                    Rectangle {
                        id: actualAnswerRectangle
                        property bool showAnswer: false
                        property string actualText: modelData.text
                        property real xScale: activityImage.paintedWidth / activityImage.sourceSize.width
                        property real yScale: activityImage.paintedHeight / activityImage.sourceSize.height
                        x: (sentencesRect.width / 2 - activityImage.paintedWidth / 2) + modelData.coords.x * xScale
                        y: (sentencesRect.height / 2 - activityImage.paintedHeight / 2) + modelData.coords.y * yScale
                        width: modelData.coords.width * xScale
                        height: modelData.coords.height * yScale
                        color: "transparent"

                        Rectangle {
                            anchors.fill: parent
                            visible: parent.showAnswer
                            color: "transparent"
                            radius: 7

                            FlowText {
                                height: parent.height
                                width: parent.width
                                text: actualAnswerRectangle.actualText
                                color: myColors.answerColor
                            }
                        }
                        MouseArea {
                            anchors.fill: parent
                            onClicked: {
                                sound.playSound(mySounds.clickAnswer);
                                actualAnswerRectangle.showAnswer = !actualAnswerRectangle.showAnswer;
                            }
                        }
                    }
                }
            }
        }
    }


    

    function handleAnswer(index, circleCount) {
        var questionIndex = parseInt(index / circleCount);
        for (var i = 0; i < circleCount; i++) {
            answersDropRepeater.itemAt(questionIndex * circleCount + i).showAnswer = false;
        }

        answersDropRepeater.itemAt(index).showAnswer = true;
    }

    
}
