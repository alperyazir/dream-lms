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
    property real markCount
    property string headerText
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
        defaultText: qsTr("Mark the correct option.")
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
                            color: "transparent"
                            visible: showAnswer

                            Image {
                                id: answerX

                                visible: showAnswer
                                width: parent.width * 0.8
                                height: parent.height * 0.8
                                source: "qrc:/icons/selectCirclle.png"
                                fillMode: Image.PreserveAspectFit
                                anchors.horizontalCenter: parent.horizontalCenter
                                anchors.verticalCenter: parent.verticalCenter
                            }

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
                                if (markCount === -1) {
                                    dropRectangle.showAnswer = !dropRectangle.showAnswer;
                                    return;
                                }

                                if (markCount === 0) {
                                    markCount = 2;
                                }
                                root.handleAnswer(index, markCount);
                            }
                        }
                    }
                }
            }
        }
    }


    function handleAnswer(index, markCount) {
        var questionIndex = parseInt(index / markCount);
        for (var i = 0; i < markCount; i++) {
            answersDropRepeater.itemAt(questionIndex * markCount + i).showAnswer = false;
        }

        answersDropRepeater.itemAt(index).showAnswer = true;
    }



   
}
