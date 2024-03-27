export default async function Home() {

    return `
    <div class="pageRow centered">
    <img src="img/logos-originals/Birdhouse-Logo-248x248.svg" class="logo big"/>
    <h1>Welcome to Birdhouse</h1>
    </div>
    <div class="centerContent">
    <h3>What is Birdhouse?</h3>
        <p class="justify">Birdhouse is a Vanilla JavaScript framework for Single Page Applications and supports easy Progressive Web App rollouts through its NodeJS Pipeline. Birdhouse is primarily designed for deployment to Apache Webserver Webspaces via SFTP. However, with necessary modifications, it can also be adapted for use in other environments. Everything is provided as is.</p>
        <div class="contentRow">    
            <p class="justify">On this website you will find the documentation, highlighting functions and variables that Birdhouse provides as well as information on how to get started.</p>
            <div class="buttonRow">
                <a class="menuButton" href="get-started">Get Started</a>
                <a class="menuButton" href="https://github.com/HousebirdGames/Birdhouse">View on GitHub</a>
            </div>
        </div>
        <h3>What can be build with Birdhouse?</h3>
        <p class="justify">The Framework is a lightweight way to have a web app that mainly utilizes the resources of the users device. You can always integrate a backend, that allows for more functionality, but this framework is aimed at providing full offline capabilities to the enduser.</p>
        <p class="justify">This very website stands as a testament to Birdhouse's capabilities. Interested users can clone the repository and deploy their private version to fully grasp its potential.</p>
        <p class="justify">Birdhouse has also been the backbone of several other projects, such as the portfolio website at <a href="https://housebird.games">housebird.games</a>, and an online notebook for friends at <a href="https://the-friend-ship.com">The Friend Ship</a>.</p>
    </div>
    `;
}