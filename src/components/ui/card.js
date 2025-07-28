import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';

function TranscriptomeCards() {
  return (
    <div className="d-flex flex-wrap gap-4 justify-content-start p-3">
      <Card className="card-hover" style={{ width: '18rem' }}>
        <Card.Img variant="top" src="images/Yucca_filamentosa.jpg" />
        <Card.Body>
          <Card.Title>Yucca filamentosa</Card.Title>
          <Card.Text>
            C3 Metabolism.
          </Card.Text>
          <Card.Text>
            Se você forçar um pouco, isso parece um Agave.
          </Card.Text>
        </Card.Body>
        <ListGroup className="list-group-flush">
          <ListGroup.Item>Transcriptome: Temporal drought-stressed and well-watered plants</ListGroup.Item>
          <ListGroup.Item>Genome: resolved at haplotype level</ListGroup.Item>
          <ListGroup.Item>turururu: yaaay</ListGroup.Item>
        </ListGroup>
        <Card.Body>
          <Button variant="primary">Download</Button>
        </Card.Body>
      </Card>

      {/* You can add more cards here */}
    </div>
  );
}

export default TranscriptomeCards;
