import React from "react";
import "./AboutPage.css";
import { assets } from "../../assets/assets";
import { FaQuoteLeft, FaStar } from "react-icons/fa";

// Khu không gian – có thể là phòng quê, khu sân vườn, phòng cổ, phòng tiệc...
const zones = [
  {
    name: "Không gian Sân Vườn",
    desc: "Khu sân vườn mở thoáng đãng, phủ đầy sắc hoa sen và cây xanh, mang lại cảm giác yên bình, trong lành như ở miền quê Bắc Bộ. Phù hợp cho gia đình sum họp, gặp mặt bạn bè cuối tuần.",
    img: assets.sanvuon,
  },
  {
    name: "Nhà Gỗ Truyền Thống",
    desc: "Những căn nhà gỗ mái ngói đỏ, nội thất tre nứa mộc mạc, gợi nhớ ký ức làng quê xưa, mang lại không gian ấm cúng, thân thuộc cho thực khách.",
    img: assets.nhago,
  },
  {
    name: "Phòng Tiệc Gia Đình",
    desc: "Không gian riêng tư, thích hợp cho bữa cơm gia đình, liên hoan, sinh nhật nhỏ – với tông màu ấm và điểm xuyết các họa tiết làng quê Việt.",
    img: assets.phongtiec,
  },
];

// Bộ sưu tập món quê, lẩu, đặc sản dân dã
const dishGallery = [
  { img: assets.mon1, name: "Lẩu cua đồng", desc: "Hương vị đồng quê truyền thống, nước lẩu thơm ngọt, thịt cua đồng tươi kết hợp với rau đồng quê, đậu phụ." },
  { img: assets.mon2, name: "Tôm rang", desc: "Tôm tươi rang mặn ngọt, lớp vỏ giòn tan, vị đậm đà ăn cùng cơm trắng nóng hổi." },
  { img: assets.mon3, name: "Canh cà nấu tép", desc: "Canh cà chua thanh mát, nấu cùng tép đồng, dậy mùi thơm giản dị của bữa cơm nhà." },
  { img: assets.mon4, name: "Gà ta hấp lá chanh", desc: "Gà thả vườn hấp mềm, thơm vị lá chanh, chấm muối tiêu chanh trứ danh vùng quê." },
  { img: assets.mon5, name: "Xôi ngô", desc: "Xôi nếp dẻo trộn ngô quê vàng ruộm, ăn cùng ruốc thịt và hành phi thơm lừng." },
  { img: assets.mon6, name: "Cá đồng kho tộ", desc: "Cá rô đồng kho riềng nghệ, thịt chắc, vị đậm đà, ăn với cơm gạo mới càng tuyệt." },
  { img: assets.mon7, name: "Đậu phụ chấm mắm tôm", desc: "Đậu phụ quê rán vàng, ăn kèm mắm tôm pha chuẩn vị Bắc, thêm chút rau thơm càng tròn vị." },
  { img: assets.mon8, name: "Rau muống luộc", desc: "Rau muống đồng tươi xanh, luộc giòn, ăn cùng nước mắm chanh ớt cay cay." },
];

// Đánh giá khách hàng
const reviews = [
  {
    name: "Thu Hồng",
    comment: "Đến Hương Sen như được trở về quê nhà. Lẩu cua đồng và cá kho tộ chuẩn vị tuổi thơ, không gian mộc mạc, nhân viên dễ thương!",
    rating: 5,
  },
  {
    name: "Anh Tuấn",
    comment: "Đồ ăn tươi, chuẩn món quê. Tôm rang, canh cà, xôi ngô ngon tuyệt. Chắc chắn sẽ đưa bố mẹ quay lại nhiều lần.",
    rating: 5,
  },
  {
    name: "Ngọc Mai",
    comment: "Không gian gần gũi, từ bàn ghế tre đến nhà gỗ, món ăn đậm chất làng quê Bắc Bộ. Giá hợp lý, phục vụ chu đáo.",
    rating: 4.5,
  },
];

const AboutPage = () => (
  <div className="about-fullpage">
    {/* Banner hình ảnh/quảng bá */}
    <section className="about-hero">
      <img className="about-hero-img" src={assets.bgnhahang} alt="Nhà hàng Hương Sen" />
      <div className="about-hero-overlay">
        <h1>Hương Sen – Hồn Quê Giữa Phố Thị</h1>
        <p>Trải nghiệm ẩm thực đồng quê Việt Nam giữa lòng thành phố</p>
      </div>
    </section>

    {/* Giới thiệu chi tiết về Hương Sen */}
    <section className="about-history section-alt">
      <div className="container">
        <h2>Chuyện Nhà Hàng Hương Sen</h2>
        <p>
          <b>Hương Sen</b> ra đời từ khát vọng gìn giữ hương vị đồng quê giữa nhịp sống phố thị hiện đại.  
          Từ bữa cơm giản dị của mẹ, từ những phiên chợ quê và cánh đồng lúa xanh mướt, mỗi món ăn tại Hương Sen đều mang theo câu chuyện và ký ức tuổi thơ miền Bắc.<br /><br />
          Không gian được thiết kế mộc mạc với mái ngói, ao sen, bàn ghế tre, hoa cau, chum nước... Đội ngũ đầu bếp là người con của quê, chăm chút từng món dân dã như lẩu cua đồng, cá kho tộ, tôm rang, canh cà, gà ta hấp lá chanh, xôi ngô, rau muống luộc...  
          Tất cả nguyên liệu đều chọn lựa kỹ càng từ các vùng quê lân cận, đảm bảo tươi ngon và đúng chuẩn vị nhà.
          <br /><br />
          Đến Hương Sen, thực khách không chỉ thưởng thức bữa cơm quê đậm đà mà còn tìm lại sự an yên, ấm áp giữa bộn bề phố thị.
        </p>
      </div>
    </section>

    {/* Triết lý & hình ảnh đầu bếp */}
    <section className="about-mission-chef">
      <div className="about-mission-content">
        <blockquote>
          <span>“Nấu món quê là nấu bằng ký ức tuổi thơ và cả tấm lòng”</span>
          <cite>- Đầu bếp trưởng Hương Sen</cite>
        </blockquote>
      </div>
      <div className="about-chef-img">
        <img src={assets.chef1} alt="Đầu bếp Hương Sen" />
      </div>
    </section>

    {/* Không gian nhà hàng */}
    <section className="about-zones section-alt">
      <div className="container">
        <h2>Không Gian Quán Quê</h2>
        <div className="about-zones-list">
          {zones.map((zone, idx) => (
            <div className="zone-card" key={idx}>
              <img src={zone.img} alt={zone.name} />
              <div className="zone-card-content">
                <h3>{zone.name}</h3>
                <p>{zone.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Bộ sưu tập món ăn quê */}
    <section className="about-gallery-dish section-alt">
      <div className="container">
        <h2>Hương Vị Quê Nhà Đặc Sắc</h2>
        <div className="gallery-dish-list">
          {dishGallery.map((dish, idx) => (
            <div className="gallery-dish-item" key={idx}>
              <img src={dish.img} alt={dish.name} />
              <div className="dish-name">{dish.name}</div>
              <div className="dish-desc">{dish.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Đánh giá khách hàng */}
    <section className="about-reviews section-alt">
      <div className="container">
        <h2>Khách Yêu Nói Gì Về Hương Sen</h2>
        <div className="about-review-list">
          {reviews.map((review, idx) => (
            <div className="about-review-card" key={idx}>
              <FaQuoteLeft className="review-quote" />
              <p>{review.comment}</p>
              <div className="review-rating">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={i < Math.floor(review.rating) ? "star-filled" : "star-empty"}
                  />
                ))}
              </div>
              <div className="review-author">{review.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default AboutPage;
