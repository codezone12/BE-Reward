const Card = require('./../Models/cardSchema');
const cloudinary = require('cloudinary').v2;

exports.createCard = async (req, res) => {
    try {
        const { title, description, creator } = req.body;
        let imageURL = '';

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            imageURL = result.secure_url; 
        }

        let newCard = new Card({
            title,
            description,
            imageURL,
            creator
        });

        await newCard.save();
        res.status(201).json({ message: "Card created successfully", card: newCard });
    } catch (error) {
        console.error("Failed to create card:", error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};

exports.getCardById = async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        if (!card) {
            return res.status(404).json({ error: "Card not found" });
        }
        res.status(200).json(card);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};


exports.editCard = async (req, res) => {
    console.log("Request body:", req.body);
    console.log("Files:", req.file);
    // Parse the form data
    const { title, description, cardId } = req.body;

    try {
        // Find the card by ID
        console.log("Searching for Card with ID:", cardId);
        const precard = await Card.findOne({ _id: cardId });

        // Check if card exists
        if (!precard) {
            return res.status(404).json({ error: "Card not found" });
        }

        // If a new file is uploaded, update the image URL
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            const imageURL = result.secure_url;
            precard.imageURL = imageURL;
        }

        // Update user information
        precard.title = title;
        precard.description = description;

        console.log(precard);

        // Save the updated user
        await precard.save();

        // Respond with updated user data
        res.status(200).json({ message: "Card updated successfully", card: precard });
    } catch (error) {
        console.error("Error updating card:", error);
        res.status(500).json({ error: "Failed to update card" });
    }
};

exports.updateCard = async (req, res) => {
    const { status, resolvedBy } = req.body;  // Receive the resolvedBy ID from the body
    const update = { status };

    // If the card is being marked as resolved, add the resolvedBy ID to the update
    if (status === 'awaitingconfirmation' && resolvedBy) {
        update.resolvedBy = resolvedBy;
    }

    try {
        const card = await Card.findByIdAndUpdate(req.params.id, update, { new: true })
                                    .populate('creator', 'name')
                                    .populate('resolvedBy', 'name');  // Optional: Populate to send back in response
        if (!card) {
            return res.status(404).json({ error: "Card not found" });
        }
        res.status(200).json({ message: "Card updated successfully", card });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};

exports.getCards = async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};

        if (status) {
            query.status = status;
        }

        // Populate the 'creator' field, retrieving only the 'name' from the User model
        const cards = await Card.find(query).populate('creator', 'name _id').populate('resolvedBy', 'name _id');

        res.status(200).json(cards);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};

exports.deleteCard = async (req, res) => {
    try {
        const result = await Card.deleteOne({ _id: req.params.id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Card not found" });
        }

        res.status(200).json({ message: "Card deleted successfully" });
    } catch (error) {
        console.error("Error deleting card:", error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
