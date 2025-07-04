import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import Header from "../../components/Header/Header";
import ExploreMenu from "../../components/ExploreMenu/ExploreMenu";
import FoodDisplay from "../../components/FoodDisplay/FoodDisplay";
import Footer from "../../components/Footer/Footer";
import { assets } from "../../assets/assets";
import "./Home.css";
import AboutSection from "../../components/AboutSection/AboutSection";
import ScrollToTopButton from "../../components/Scroll/ScrollToTopButton";

const Home = () => {
  const [category, setCategory] = useState("All");
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <div
        className="navbar-header-wrapper"
        style={{
          background: `url(${assets.background}) no-repeat center center`,
          backgroundSize: "cover",
        }}
      >
        {/* <Navbar setShowLogin={setShowLogin} /> */}
        <Header />
      </div>
      <AboutSection />
      {/* <ExploreMenu category={category} setCategory={setCategory} /> */}
      <FoodDisplay category={category} />
      <ScrollToTopButton />
    </>
  );
};

export default Home;