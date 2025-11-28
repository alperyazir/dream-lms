import QtQuick
import QtQuick.Controls

import "../components"
import "components"
import "Particles.js" as Particles

Rectangle {
    id: root
    property string imageSource
    property var shuffledWords: []
    property var answers
    property string audio_path
    property bool hasPreviousActivity: false
    property bool hasNextActivity: false
    signal closed
    signal prevActivity
    signal nextActivity
    property var dragMap: []
    property var dropMap: []
    property string correctColor: myColors.correctColor
    property string wrongColor: myColors.wrongColor
    property string standColor: myColors.standColor
    property string headerText
    width: parent.width - 10
    height: parent.height
    radius: 30

    ActivityHeader {
        id: header
        headerText: root.headerText
        defaultText: qsTr("Complete the sentences.")
    }

    Column {
        id: actColumn
        property real biggestWidth: 0
        property real biggestHeight: 0
        anchors.top: header.bottom
        anchors.bottom: parent.bottom
        anchors.left: settingsColumn.right
        anchors.right: parent.right
        anchors.topMargin: 10
        anchors.leftMargin: 20
        anchors.rightMargin: 20
        spacing: 5

        Rectangle {
            id: draggableWords
            color: "transparent"
            anchors.horizontalCenter: parent.horizontalCenter
            width: parent.width
            height: actColumn.biggestHeight * 2 + 10
            z: 2

            DragabbleWords {
                dragMap: root.dragMap
                shuffledWords: root.shuffledWords
                anchors.centerIn: parent
                biggestWidth: actColumn.biggestWidth
                biggestHeight: actColumn.biggestHeight
            }
        }

        Rectangle {
            id: sentencesRect
            width: parent.width
            height: parent.height - draggableWords.height
            radius: 10
            color: "transparent"
            z: 1
            anchors.horizontalCenter: parent.horizontalCenter

            Image {
                id: activityImage
                source: imageSource
                antialiasing: true
                smooth: true
                fillMode: Image.PreserveAspectFit
                height: parent.height
                width: parent.width

                Repeater {
                    id: answersDropRepeater
                    model: answers
                    Rectangle {
                        id: dropRectangle
                        property bool showAnswer: false
                        property var correctAnswerText: modelData.text
                        property real xScale: activityImage.paintedWidth / activityImage.sourceSize.width
                        property real yScale: activityImage.paintedHeight / activityImage.sourceSize.height
                        x: (sentencesRect.width / 2 - activityImage.paintedWidth / 2) + modelData.coords.x * xScale
                        y: (sentencesRect.height / 2 - activityImage.paintedHeight / 2) + modelData.coords.y * yScale
                        width: modelData.coords.width * xScale
                        height: modelData.coords.height * yScale
                        color: "transparent"
                        radius: 5

                        DropArea {
                            id: dragTarget
                            property var correctAnswerText: modelData.text
                            property bool isOccupied: false
                            anchors.fill: parent
                            anchors.bottomMargin: 3
                            keys: ["thissouldbeasecret"]
                            states: [
                                State {
                                    when: dragTarget.containsDrag && !dragTarget.isOccupied
                                    PropertyChanges {
                                        target: dropRectangle
                                        color: myColors.highlightColor
                                        opacity: 0.3
                                    }
                                }
                            ]
                            onChildrenChanged: {
                                if (children.length === 0) {
                                    isOccupied = false;
                                }
                            }
                        }
                        Component.onCompleted: {
                            root.dropMap.push({
                                dropItem: dragTarget
                            });
                            if (width > actColumn.biggestWidth) {
                                actColumn.biggestWidth = width;
                            }

                            if (height > actColumn.biggestHeight) {
                                actColumn.biggestHeight = height;
                            }
                        }
                    }
                }
            }
        }
    }

    
}
